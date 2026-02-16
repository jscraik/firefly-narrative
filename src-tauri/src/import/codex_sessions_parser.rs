//! Codex session JSONL parser.
//!
//! Codex writes structured session logs under:
//! - ~/.codex/sessions/**.jsonl
//! - ~/.codex/archived_sessions/**.jsonl
//!
//! Additionally, ~/.codex/history.jsonl is a global index that can be used to
//! discover the latest active session id. We do **not** import it directly
//! (it aggregates many sessions). Instead, when asked to parse history.jsonl
//! we resolve the latest session file and parse that.

use super::{
    parser::{WarningSeverity, *},
    path_validator::PathValidator,
    secure_parser::SecretScanner,
};
use crate::session_hash::generate_session_hash;
use serde_json::Value;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

pub struct CodexSessionJsonlParser;

fn normalize_path_slashes(path: &Path) -> String {
    // Many path heuristics below use '/' separators. Normalize so the code works on Windows too.
    path.to_string_lossy().replace('\\', "/")
}

impl SessionParser for CodexSessionJsonlParser {
    fn can_parse(&self, path: &Path) -> bool {
        let s = normalize_path_slashes(path);

        // Codex global history index (special handling).
        if s.ends_with("/.codex/history.jsonl") && path.is_file() {
            return true;
        }

        // Codex per-session files.
        if !path.is_file() {
            return false;
        }
        if !s.contains(".codex/") {
            return false;
        }
        if !(s.contains(".codex/sessions/") || s.contains(".codex/archived_sessions/")) {
            return false;
        }
        path.extension().map(|e| e == "jsonl").unwrap_or(false)
    }

    fn parse(&self, path: &Path) -> ParseResult<ParsedSession> {
        // Security: Validate path
        if let Err(e) = PathValidator::validate(path) {
            return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                e.to_string(),
            )));
        }

        let s = normalize_path_slashes(path);
        if s.ends_with("/.codex/history.jsonl") {
            return self.parse_history_pointer(path);
        }

        self.parse_session_file(path)
    }
}

impl CodexSessionJsonlParser {
    fn parse_history_pointer(&self, history_path: &Path) -> ParseResult<ParsedSession> {
        // ~/.codex/history.jsonl aggregates many sessions. We'll:
        // 1) read last ~N lines
        // 2) take the latest session_id
        // 3) resolve a matching session jsonl file and parse that.
        // Avoid reading the whole file into memory: keep a ring buffer of the last N lines.
        let file = match std::fs::File::open(history_path) {
            Ok(f) => f,
            Err(e) => return ParseResult::Failure(ParseError::Io(e)),
        };
        let mut last_lines: VecDeque<String> = VecDeque::with_capacity(5000);
        let reader = BufReader::new(file);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(e) => return ParseResult::Failure(ParseError::Io(e)),
            };
            if last_lines.len() == 5000 {
                last_lines.pop_front();
            }
            last_lines.push_back(line);
        }

        let mut latest_session_id: Option<String> = None;
        for line in last_lines.iter().rev() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<Value>(line) {
                if let Some(sid) = v.get("session_id").and_then(|x| x.as_str()) {
                    latest_session_id = Some(sid.to_string());
                    break;
                }
            }
        }

        let Some(sid) = latest_session_id else {
            return ParseResult::Failure(ParseError::UnsupportedFormat);
        };

        let Some(session_file) = resolve_codex_session_file(&sid) else {
            return ParseResult::Failure(ParseError::UnsupportedFormat);
        };

        // Note: PathValidator allows ~/.codex, so parsing the resolved file is still safe.
        self.parse_session_file(&session_file)
    }

    fn parse_session_file(&self, path: &Path) -> ParseResult<ParsedSession> {
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => return ParseResult::Failure(ParseError::Io(e)),
        };

        const MAX_SIZE: usize = 100 * 1024 * 1024; // 100MB
        if content.len() > MAX_SIZE {
            return ParseResult::Failure(ParseError::FileTooLarge);
        }

        let mut trace = SessionTrace::new();
        let mut warnings: Vec<ParseWarning> = Vec::new();
        let mut files_touched: Vec<String> = Vec::new();

        let mut conversation_id: Option<String> = None;
        let mut model: Option<String> = None;
        let mut ts_first: Option<chrono::DateTime<chrono::Utc>> = None;
        let mut ts_last: Option<chrono::DateTime<chrono::Utc>> = None;

        for (line_num, line) in content.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Best-effort security scan.
            let secret_findings = SecretScanner::scan(line);
            if !secret_findings.is_empty() {
                warnings.push(ParseWarning {
                    severity: WarningSeverity::Security,
                    message: format!(
                        "Potential {} detected",
                        secret_findings
                            .iter()
                            .map(|f| f.kind.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    ),
                    context: Some(format!("line {}", line_num + 1)),
                });
            }

            let entry: Value = match serde_json::from_str(line) {
                Ok(v) => v,
                Err(e) => {
                    warnings.push(ParseWarning {
                        severity: WarningSeverity::Warning,
                        message: format!("JSON parse error: {}", e),
                        context: Some(format!("line {}", line_num + 1)),
                    });
                    continue;
                }
            };

            // Timestamp bookkeeping (if present).
            if let Some(ts) = entry.get("timestamp").and_then(|t| t.as_str()) {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                    let dt = dt.with_timezone(&chrono::Utc);
                    ts_first = Some(ts_first.map_or(dt, |prev| prev.min(dt)));
                    ts_last = Some(ts_last.map_or(dt, |prev| prev.max(dt)));
                }
            }

            let kind = entry.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let payload = entry.get("payload").cloned().unwrap_or(Value::Null);

            match kind {
                "session_meta" => {
                    if conversation_id.is_none() {
                        conversation_id = payload
                            .get("id")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                    }
                    if model.is_none() {
                        model = payload
                            .get("model_provider")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                    }
                }
                "response_item" => {
                    self.parse_response_item(&payload, &mut trace, &mut files_touched);
                }
                // Ignore UI/event plumbing; they are not stable and often redundant.
                _ => {}
            }
        }

        files_touched.sort();
        files_touched.dedup();

        let conversation_id = conversation_id
            .or_else(|| {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "unknown".to_string());

        let session_id = generate_session_hash("codex", &conversation_id);

        // Duration is currently not persisted for Codex sessions (optional enhancement).
        let _duration = match (ts_first, ts_last) {
            (Some(a), Some(b)) if b >= a => Some((b - a).num_minutes()),
            _ => None,
        };

        let parsed = ParsedSession {
            origin: SessionOrigin {
                tool: "codex".to_string(),
                session_id,
                conversation_id,
                model,
            },
            started_at: ts_first,
            ended_at: ts_last,
            trace,
            files_touched,
        };

        if warnings.is_empty() {
            ParseResult::Success(parsed)
        } else {
            ParseResult::Partial(parsed, warnings)
        }
    }

    fn parse_response_item(
        &self,
        payload: &Value,
        trace: &mut SessionTrace,
        files: &mut Vec<String>,
    ) {
        // Tool call shape (no role, has name+arguments)
        if payload.get("name").is_some() && payload.get("arguments").is_some() {
            let tool_name = payload
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("tool")
                .to_string();
            let args_raw = payload.get("arguments").cloned().unwrap_or(Value::Null);

            // Extract file path hints from arguments (best-effort).
            if let Some(obj) = args_raw.as_object() {
                for key in ["file_path", "path", "filepath"] {
                    if let Some(v) = obj.get(key).and_then(|v| v.as_str()) {
                        files.push(v.to_string());
                    }
                }
            } else if let Some(s) = args_raw.as_str() {
                if let Ok(v) = serde_json::from_str::<Value>(s) {
                    if let Some(obj) = v.as_object() {
                        for key in ["file_path", "path", "filepath"] {
                            if let Some(v) = obj.get(key).and_then(|v| v.as_str()) {
                                files.push(v.to_string());
                            }
                        }
                    }
                }
            }

            trace.add_message(TraceMessage::ToolCall {
                tool_name,
                input: Some(args_raw),
                timestamp: None,
            });
            return;
        }

        // Normal role+content messages
        let role = payload.get("role").and_then(|v| v.as_str());
        let text = extract_codex_content_text(payload)
            .or_else(|| {
                payload
                    .get("summary")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_default();

        match role {
            Some("user") => trace.add_message(TraceMessage::User {
                text,
                timestamp: None,
            }),
            Some("assistant") => trace.add_message(TraceMessage::Assistant {
                text,
                timestamp: None,
            }),
            Some("system") => {}
            _ => {}
        }
    }
}

fn extract_codex_content_text(payload: &Value) -> Option<String> {
    let content = payload.get("content")?;
    if let Some(s) = content.as_str() {
        return Some(s.to_string());
    }
    let arr = content.as_array()?;
    let mut out = String::new();
    for item in arr {
        if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
            if !out.is_empty() {
                out.push('\n');
            }
            out.push_str(t);
        }
    }
    Some(out)
}

fn resolve_codex_session_file(session_id: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let candidates = [
        home.join(".codex/sessions"),
        home.join(".codex/archived_sessions"),
    ];

    let mut budget = 50_000usize;
    for base in candidates {
        if !base.exists() {
            continue;
        }
        if let Some(found) = walk_find_first(&base, session_id, 0, 6, &mut budget) {
            return Some(found);
        }
    }
    None
}

fn walk_find_first(
    dir: &Path,
    needle: &str,
    depth: usize,
    max_depth: usize,
    budget: &mut usize,
) -> Option<PathBuf> {
    if depth > max_depth || *budget == 0 {
        return None;
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        if *budget == 0 {
            return None;
        }
        *budget -= 1;
        let p = entry.path();
        if p.is_dir() {
            if let Some(found) = walk_find_first(&p, needle, depth + 1, max_depth, budget) {
                return Some(found);
            }
            continue;
        }
        if p.is_file() {
            if let Some(name) = p.file_name().and_then(|s| s.to_str()) {
                if name.contains(needle) && name.ends_with(".jsonl") {
                    return Some(p);
                }
            }
        }
    }
    None
}
