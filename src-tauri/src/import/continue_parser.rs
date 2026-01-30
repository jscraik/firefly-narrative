//! Continue.dev session parser
//!
//! Parses JSON/JSONL files from Continue.dev's conversation storage.
//! Continue stores sessions in JSON format with a specific schema.

use super::{
    parser::{
        ParseError, ParseResult, ParseWarning, ParsedSession, SessionOrigin, SessionTrace,
        TraceMessage, WarningSeverity,
    },
    path_validator::PathValidator,
    secure_parser::SecretScanner,
};
use crate::session_hash::generate_session_hash;
use serde_json::Value;
use std::path::Path;

pub struct ContinueParser;

impl super::parser::SessionParser for ContinueParser {
    fn can_parse(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        // Check for Continue-related paths
        (path_str.contains("continue") || path_str.contains(".continue"))
            && (path.extension().map(|e| e == "json").unwrap_or(false)
                || path.extension().map(|e| e == "jsonl").unwrap_or(false))
    }

    fn parse(&self, path: &Path) -> ParseResult<ParsedSession> {
        // Security: Validate path
        if let Err(e) = PathValidator::validate(path) {
            return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                e.to_string(),
            )));
        }

        // Read file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => return ParseResult::Failure(ParseError::Io(e)),
        };

        // Security: Check file size
        const MAX_SIZE: usize = 100 * 1024 * 1024; // 100MB
        if content.len() > MAX_SIZE {
            return ParseResult::Failure(ParseError::FileTooLarge);
        }

        let extension = path.extension().and_then(|e| e.to_str());

        match extension {
            Some("jsonl") => self.parse_jsonl(&content, path),
            Some("json") => self.parse_json(&content, path),
            _ => ParseResult::Failure(ParseError::UnsupportedFormat),
        }
    }
}

impl ContinueParser {
    fn parse_jsonl(&self, content: &str, path: &Path) -> ParseResult<ParsedSession> {
        let mut trace = SessionTrace::new();
        let mut warnings = Vec::new();
        let mut model: Option<String> = None;
        let mut conversation_id: Option<String> = None;

        for (line_num, line) in content.lines().enumerate() {
            if line.trim().is_empty() {
                continue;
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

            // Extract session ID from first entry
            if conversation_id.is_none() {
                conversation_id = entry["session_id"]
                    .as_str()
                    .or_else(|| entry["id"].as_str())
                    .map(String::from);
            }

            // Extract model
            if model.is_none() {
                model = entry["model"]
                    .as_str()
                    .or_else(|| entry["config"]["model"].as_str())
                    .map(String::from);
            }

            // Security scan
            if let Some(text) = entry["content"].as_str().or_else(|| entry["text"].as_str()) {
                let secret_findings = SecretScanner::scan(text);
                if !secret_findings.is_empty() {
                    warnings.push(ParseWarning {
                        severity: WarningSeverity::Security,
                        message: format!(
                            "Potential secrets detected: {}",
                            secret_findings
                                .iter()
                                .map(|f| f.kind.as_str())
                                .collect::<Vec<_>>()
                                .join(", ")
                        ),
                        context: Some(format!("line {}", line_num + 1)),
                    });
                }
            }

            // Parse message
            let role = entry["role"]
                .as_str()
                .or_else(|| entry["type"].as_str())
                .unwrap_or("");
            let text = entry["content"]
                .as_str()
                .or_else(|| entry["text"].as_str())
                .unwrap_or("")
                .to_string();
            let timestamp = entry["timestamp"].as_str().map(String::from);

            match role {
                "user" => trace.add_message(TraceMessage::User { text, timestamp }),
                "assistant" => trace.add_message(TraceMessage::Assistant { text, timestamp }),
                "system" => {} // Skip system messages
                _ => {}
            }
        }

        let conversation_id = conversation_id
            .or_else(|| path.file_stem().and_then(|s| s.to_str()).map(String::from))
            .unwrap_or_else(|| "unknown".to_string());

        let session_id = generate_session_hash("continue", &conversation_id);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "continue".to_string(),
                session_id,
                conversation_id,
                model,
            },
            started_at: None,
            ended_at: None,
            trace,
            files_touched: Vec::new(),
        };

        if warnings.is_empty() {
            ParseResult::Success(session)
        } else {
            ParseResult::Partial(session, warnings)
        }
    }

    fn parse_json(&self, content: &str, path: &Path) -> ParseResult<ParsedSession> {
        let json: Value = match serde_json::from_str(content) {
            Ok(v) => v,
            Err(e) => return ParseResult::Failure(ParseError::Json(e)),
        };

        let mut trace = SessionTrace::new();
        let mut warnings = Vec::new();
        let model: Option<String> = json["model"]
            .as_str()
            .or_else(|| json["config"]["model"].as_str())
            .map(String::from);

        // Continue JSON format: { "history": [{"role": ..., "content": ...}] }
        if let Some(history) = json["history"].as_array() {
            for (idx, msg) in history.iter().enumerate() {
                // Security scan
                if let Some(text) = msg["content"].as_str() {
                    let secret_findings = SecretScanner::scan(text);
                    if !secret_findings.is_empty() {
                        warnings.push(ParseWarning {
                            severity: WarningSeverity::Security,
                            message: format!(
                                "Potential secrets detected: {}",
                                secret_findings
                                    .iter()
                                    .map(|f| f.kind.as_str())
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            ),
                            context: Some(format!("message {}", idx)),
                        });
                    }
                }

                let role = msg["role"].as_str().unwrap_or("");
                let text = msg["content"].as_str().unwrap_or("").to_string();
                let timestamp = msg["timestamp"].as_str().map(String::from);

                match role {
                    "user" => trace.add_message(TraceMessage::User { text, timestamp }),
                    "assistant" => trace.add_message(TraceMessage::Assistant { text, timestamp }),
                    "system" => {} // Skip system messages
                    _ => {}
                }
            }
        }
        // Alternative format: { "messages": [...] }
        else if let Some(messages) = json["messages"].as_array() {
            for (idx, msg) in messages.iter().enumerate() {
                if let Some(text) = msg["content"].as_str() {
                    let secret_findings = SecretScanner::scan(text);
                    if !secret_findings.is_empty() {
                        warnings.push(ParseWarning {
                            severity: WarningSeverity::Security,
                            message: format!(
                                "Potential secrets detected: {}",
                                secret_findings
                                    .iter()
                                    .map(|f| f.kind.as_str())
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            ),
                            context: Some(format!("message {}", idx)),
                        });
                    }
                }

                let role = msg["role"].as_str().unwrap_or("");
                let text = msg["content"].as_str().unwrap_or("").to_string();
                let timestamp = msg["timestamp"].as_str().map(String::from);

                match role {
                    "user" => trace.add_message(TraceMessage::User { text, timestamp }),
                    "assistant" => trace.add_message(TraceMessage::Assistant { text, timestamp }),
                    "system" => {}
                    _ => {}
                }
            }
        }

        // Extract conversation ID
        let conversation_id = json["id"]
            .as_str()
            .or_else(|| json["session_id"].as_str())
            .or_else(|| path.file_stem().and_then(|s| s.to_str()))
            .unwrap_or("unknown")
            .to_string();

        let session_id = generate_session_hash("continue", &conversation_id);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "continue".to_string(),
                session_id,
                conversation_id,
                model,
            },
            started_at: None,
            ended_at: None,
            trace,
            files_touched: Vec::new(),
        };

        if warnings.is_empty() {
            ParseResult::Success(session)
        } else {
            ParseResult::Partial(session, warnings)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::parser::SessionParser;

    #[test]
    fn test_can_parse_continue_files() {
        let parser = ContinueParser;

        // Should parse Continue JSON files
        let continue_path = Path::new("/home/user/.continue/sessions/session.json");
        assert!(parser.can_parse(continue_path));

        let continue_jsonl = Path::new("/home/user/continue/history.jsonl");
        assert!(parser.can_parse(continue_jsonl));

        // Should not parse other files
        let other_path = Path::new("/some/other/path.txt");
        assert!(!parser.can_parse(other_path));
    }
}
