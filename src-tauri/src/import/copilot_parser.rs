//! GitHub Copilot session parser
//!
//! Parses VS Code Copilot conversation exports.
//! Copilot stores data in VS Code's SQLite database or JSON exports.

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

pub struct CopilotParser;

impl super::parser::SessionParser for CopilotParser {
    fn can_parse(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        // Check for Copilot-related paths or filenames
        (path_str.contains("copilot") || path_str.contains("github"))
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

impl CopilotParser {
    fn parse_jsonl(&self, content: &str, path: &Path) -> ParseResult<ParsedSession> {
        let mut trace = SessionTrace::new();
        let mut warnings = Vec::new();
        let mut model: Option<String> = None;

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

            // Extract model from metadata
            if model.is_none() {
                model = entry["model"]
                    .as_str()
                    .or_else(|| entry["metadata"]["model"].as_str())
                    .map(String::from);
            }

            // Parse message based on role or type
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
                "user" | "prompt" => {
                    trace.add_message(TraceMessage::User { text, timestamp });
                }
                "assistant" | "completion" | "response" => {
                    trace.add_message(TraceMessage::Assistant { text, timestamp });
                }
                _ => {}
            }
        }

        // Extract conversation ID from filename
        let conversation_id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let session_id = generate_session_hash("copilot", &conversation_id);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "copilot".to_string(),
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
            .or_else(|| json["metadata"]["model"].as_str())
            .map(String::from);

        // Try different Copilot JSON formats
        // Format 1: { "conversations": [{ "messages": [...] }] }
        if let Some(conversations) = json["conversations"].as_array() {
            for conv in conversations {
                if let Some(messages) = conv["messages"].as_array() {
                    for (idx, msg) in messages.iter().enumerate() {
                        self.parse_message(msg, &mut trace, &mut warnings, idx);
                    }
                }
            }
        }
        // Format 2: { "messages": [...] }
        else if let Some(messages) = json["messages"].as_array() {
            for (idx, msg) in messages.iter().enumerate() {
                self.parse_message(msg, &mut trace, &mut warnings, idx);
            }
        }
        // Format 3: { "history": [...] }
        else if let Some(history) = json["history"].as_array() {
            for (idx, item) in history.iter().enumerate() {
                self.parse_message(item, &mut trace, &mut warnings, idx);
            }
        }

        // Extract conversation ID
        let conversation_id = json["id"]
            .as_str()
            .or_else(|| path.file_stem().and_then(|s| s.to_str()))
            .unwrap_or("unknown")
            .to_string();

        let session_id = generate_session_hash("copilot", &conversation_id);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "copilot".to_string(),
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

    fn parse_message(
        &self,
        msg: &Value,
        trace: &mut SessionTrace,
        warnings: &mut Vec<ParseWarning>,
        idx: usize,
    ) {
        // Security scan
        if let Some(text) = msg["content"].as_str().or_else(|| msg["text"].as_str()) {
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

        let role = msg["role"]
            .as_str()
            .or_else(|| msg["type"].as_str())
            .unwrap_or("");
        let text = msg["content"]
            .as_str()
            .or_else(|| msg["text"].as_str())
            .unwrap_or("")
            .to_string();
        let timestamp = msg["timestamp"].as_str().map(String::from);

        match role {
            "user" | "prompt" => trace.add_message(TraceMessage::User { text, timestamp }),
            "assistant" | "completion" | "response" | "ai" => {
                trace.add_message(TraceMessage::Assistant { text, timestamp })
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::parser::SessionParser;

    #[test]
    fn test_can_parse_copilot_files() {
        let parser = CopilotParser;

        // Should parse Copilot JSON files
        let copilot_path = Path::new("/home/user/.copilot/conversations/session.json");
        assert!(parser.can_parse(copilot_path));

        let github_path = Path::new("/home/user/github-copilot/export.jsonl");
        assert!(parser.can_parse(github_path));

        // Should not parse other files
        let other_path = Path::new("/some/other/path.txt");
        assert!(!parser.can_parse(other_path));
    }
}
