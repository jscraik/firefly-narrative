//! Google Gemini / AI Studio session parser
//!
//! Parses JSON files from Gemini's conversation exports.
//! Files are typically named with timestamp or conversation ID.

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

pub struct GeminiParser;

impl super::parser::SessionParser for GeminiParser {
    fn can_parse(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        // Check for Gemini-related paths or filenames
        (path_str.contains("gemini") || path_str.contains("google-ai"))
            && path.extension().map(|e| e == "json").unwrap_or(false)
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

        // Parse JSON
        let json: Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(e) => return ParseResult::Failure(ParseError::Json(e)),
        };

        // Extract session ID from filename or JSON
        let conversation_id = json["id"]
            .as_str()
            .or_else(|| path.file_stem().and_then(|s| s.to_str()))
            .unwrap_or("unknown")
            .to_string();

        // Generate deterministic session hash
        let session_id = generate_session_hash("gemini", &conversation_id);

        // Parse messages
        let mut trace = SessionTrace::new();
        let mut warnings = Vec::new();
        let mut model: Option<String> = None;

        // Try different Gemini JSON formats
        // Format 1: { "messages": [...] }
        if let Some(messages) = json["messages"].as_array() {
            for (idx, msg) in messages.iter().enumerate() {
                if let Some(text) = msg["content"].as_str() {
                    // Security scan
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
                            context: Some(format!("line {}", idx + 1)),
                        });
                    }
                }

                let role = msg["role"].as_str().unwrap_or("");
                let text = msg["content"].as_str().unwrap_or("").to_string();
                let timestamp = msg["timestamp"].as_str().map(String::from);

                match role {
                    "user" => trace.add_message(TraceMessage::User { text, timestamp }),
                    "assistant" | "model" => {
                        // Extract model info if present
                        if model.is_none() && msg["model"].is_string() {
                            model = msg["model"].as_str().map(String::from);
                        }
                        trace.add_message(TraceMessage::Assistant { text, timestamp })
                    }
                    _ => {}
                }
            }
        }
        // Format 2: { "history": [{ "user": ..., "response": ... }] }
        else if let Some(history) = json["history"].as_array() {
            for item in history {
                if let Some(user_text) = item["user"].as_str() {
                    trace.add_message(TraceMessage::User {
                        text: user_text.to_string(),
                        timestamp: None,
                    });
                }
                if let Some(response_text) = item["response"].as_str() {
                    trace.add_message(TraceMessage::Assistant {
                        text: response_text.to_string(),
                        timestamp: None,
                    });
                }
            }
        }

        // Extract model from metadata if not found in messages
        if model.is_none() {
            model = json["model"]
                .as_str()
                .map(String::from)
                .or_else(|| json["metadata"]["model"].as_str().map(String::from));
        }

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "gemini".to_string(),
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
    fn test_can_parse_gemini_files() {
        let parser = GeminiParser;

        // Should parse Gemini JSON files
        let gemini_path = Path::new("/home/user/.gemini/conversations/session.json");
        assert!(parser.can_parse(gemini_path));

        let google_ai_path = Path::new("/home/user/google-ai/export.json");
        assert!(parser.can_parse(google_ai_path));

        // Should not parse other files
        let other_path = Path::new("/some/other/path.txt");
        assert!(!parser.can_parse(other_path));
    }
}
