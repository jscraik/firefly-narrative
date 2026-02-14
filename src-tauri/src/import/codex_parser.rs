//! Codex CLI log parser (heuristic).
//!
//! This is a best-effort fallback when OTLP telemetry is not enabled.
//! It parses `~/.codex/logs/*.log*` and extracts:
//! - user/assistant/tool "messages" based on common prefixes
//! - file paths based on "modified/created/deleted/changed" heuristics

use super::{
    parser::{WarningSeverity, *},
    path_validator::PathValidator,
    secure_parser::SecretScanner,
};
use crate::session_hash::generate_session_hash_from_path;
use regex::Regex;
use std::path::Path;

pub struct CodexLogParser;

impl SessionParser for CodexLogParser {
    fn can_parse(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        path_str.contains(".codex") && path_str.contains(".log") && path.is_file()
    }

    fn parse(&self, path: &Path) -> ParseResult<ParsedSession> {
        // Security: Validate path
        if let Err(e) = PathValidator::validate(path) {
            return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                e.to_string(),
            )));
        }

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => return ParseResult::Failure(ParseError::Io(e)),
        };

        const MAX_SIZE: usize = 100 * 1024 * 1024; // 100MB
        if content.len() > MAX_SIZE {
            return ParseResult::Failure(ParseError::FileTooLarge);
        }

        let mut warnings: Vec<ParseWarning> = Vec::new();
        let mut trace = SessionTrace::new();
        let mut files_touched: Vec<String> = Vec::new();

        // Deterministic session hash from filename
        let session_id = generate_session_hash_from_path("codex", path);
        let conversation_id = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("codex-log")
            .to_string();

        let re_msg = Regex::new(r"^(?i)(user|assistant|tool):\s*(.*)$").unwrap();
        let re_file =
            Regex::new(r"(?i)(?:modified|created|deleted|changed)[\\s:]+([^\\s]+\\.[A-Za-z0-9_]+)")
                .unwrap();

        for (idx, line) in content.lines().enumerate() {
            if line.trim().is_empty() {
                continue;
            }

            // Security scan (best effort)
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
                    context: Some(format!("line {}", idx + 1)),
                });
            }

            // File change hints
            for cap in re_file.captures_iter(line) {
                if let Some(m) = cap.get(1) {
                    files_touched.push(m.as_str().to_string());
                }
            }

            // Message extraction
            if let Some(caps) = re_msg.captures(line) {
                let role = caps.get(1).map(|m| m.as_str().to_lowercase());
                let text = caps
                    .get(2)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();
                match role.as_deref() {
                    Some("user") => trace.add_message(TraceMessage::User {
                        text,
                        timestamp: None,
                    }),
                    Some("assistant") => trace.add_message(TraceMessage::Assistant {
                        text,
                        timestamp: None,
                    }),
                    Some("tool") => trace.add_message(TraceMessage::ToolCall {
                        tool_name: "tool".to_string(),
                        input: Some(serde_json::json!({ "raw": text })),
                        timestamp: None,
                    }),
                    _ => {}
                }
            }
        }

        files_touched.sort();
        files_touched.dedup();

        let parsed = ParsedSession {
            origin: SessionOrigin {
                tool: "codex".to_string(),
                session_id,
                conversation_id,
                model: None,
            },
            started_at: None,
            ended_at: None,
            trace,
            files_touched,
        };

        if warnings.is_empty() {
            ParseResult::Success(parsed)
        } else {
            ParseResult::Partial(parsed, warnings)
        }
    }
}
