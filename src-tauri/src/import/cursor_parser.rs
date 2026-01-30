//! Cursor Composer session parser
//!
//! Parses SQLite database from Cursor's composer storage.
//! Database location: ~/.cursor/composer/composer.database
//!
//! Table: composer_chat
//! Columns: id, context, createdAt, updatedAt

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

pub struct CursorParser;

impl super::parser::SessionParser for CursorParser {
    fn can_parse(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        // Check for Cursor composer database or JSON files
        (path_str.contains(".cursor") && path_str.ends_with(".database"))
            || (path_str.contains(".cursor") && path_str.ends_with(".json"))
    }

    fn parse(&self, path: &Path) -> ParseResult<ParsedSession> {
        // Security: Validate path
        if let Err(e) = PathValidator::validate(path) {
            return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                e.to_string(),
            )));
        }

        // Check file extension to determine parsing strategy
        let extension = path.extension().and_then(|e| e.to_str());

        match extension {
            Some("database") => self.parse_sqlite_db(path),
            Some("json") => self.parse_json_file(path),
            _ => ParseResult::Failure(ParseError::UnsupportedFormat),
        }
    }
}

impl CursorParser {
    /// Parse Cursor's SQLite composer database
    fn parse_sqlite_db(&self, path: &Path) -> ParseResult<ParsedSession> {
        use rusqlite::{Connection, Result as SqliteResult};

        let conn = match Connection::open(path) {
            Ok(c) => c,
            Err(e) => {
                return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Failed to open Cursor DB: {}", e),
                )))
            }
        };

        // Query the composer_chat table
        let mut stmt = match conn.prepare(
            "SELECT id, context, createdAt, updatedAt FROM composer_chat ORDER BY createdAt DESC LIMIT 1"
        ) {
            Ok(s) => s,
            Err(e) => return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to prepare query: {}", e),
            ))),
        };

        let session_result: SqliteResult<(String, String, i64, i64)> = stmt.query_row([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        });

        let (id, context, created_at, _updated_at) = match session_result {
            Ok(r) => r,
            Err(e) => {
                return ParseResult::Failure(ParseError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("No sessions found in database: {}", e),
                )))
            }
        };

        // Parse context JSON for messages
        let (trace, warnings) = self.parse_cursor_context(&context);

        // Generate deterministic session hash
        let session_id = generate_session_hash("cursor", &id);

        // Convert timestamps
        let started_at = chrono::DateTime::from_timestamp(created_at / 1000, 0);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "cursor".to_string(),
                session_id,
                conversation_id: id,
                model: None, // Cursor doesn't expose model in this format
            },
            started_at,
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

    /// Parse a standalone Cursor JSON file
    fn parse_json_file(&self, path: &Path) -> ParseResult<ParsedSession> {
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

        // Extract ID
        let id = json["id"]
            .as_str()
            .or_else(|| path.file_stem().and_then(|s| s.to_str()))
            .unwrap_or("unknown")
            .to_string();

        // Generate session hash
        let session_id = generate_session_hash("cursor", &id);

        // Parse messages from context or messages field
        let context = json["context"].as_str().unwrap_or("{}");
        let (trace, warnings) = self.parse_cursor_context(context);

        let session = ParsedSession {
            origin: SessionOrigin {
                tool: "cursor".to_string(),
                session_id,
                conversation_id: id,
                model: json["model"].as_str().map(|s| s.to_string()),
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

    /// Parse Cursor's context JSON for messages
    fn parse_cursor_context(&self, context: &str) -> (SessionTrace, Vec<ParseWarning>) {
        let mut trace = SessionTrace::new();
        let mut warnings = Vec::new();

        let json: Value = match serde_json::from_str(context) {
            Ok(v) => v,
            Err(e) => {
                warnings.push(ParseWarning {
                    severity: WarningSeverity::Warning,
                    message: format!("Failed to parse context JSON: {}", e),
                    context: None,
                });
                return (trace, warnings);
            }
        };

        // Extract messages array
        if let Some(messages) = json["messages"].as_array() {
            for (idx, msg) in messages.iter().enumerate() {
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

                // Parse message
                let role = msg["role"].as_str().unwrap_or("");
                let content = msg["content"].as_str().unwrap_or("");

                match role {
                    "user" => {
                        trace.add_message(TraceMessage::User {
                            text: content.to_string(),
                            timestamp: None,
                        });
                    }
                    "assistant" => {
                        trace.add_message(TraceMessage::Assistant {
                            text: content.to_string(),
                            timestamp: None,
                        });
                    }
                    _ => {} // Skip unknown roles
                }
            }
        }

        (trace, warnings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::parser::SessionParser;

    #[test]
    fn test_can_parse_cursor_files() {
        let parser = CursorParser;

        // Should parse Cursor database
        let db_path = Path::new("/home/user/.cursor/composer/composer.database");
        assert!(parser.can_parse(db_path));

        // Should parse Cursor JSON
        let json_path = Path::new("/home/user/.cursor/sessions/session.json");
        assert!(parser.can_parse(json_path));

        // Should not parse other files
        let other_path = Path::new("/some/other/path.txt");
        assert!(!parser.can_parse(other_path));
    }

    #[test]
    fn test_parse_cursor_context() {
        let parser = CursorParser;
        let context = r#"{
            "messages": [
                {"role": "user", "content": "Hello Cursor"},
                {"role": "assistant", "content": "Hello! How can I help?"}
            ]
        }"#;

        let (trace, warnings) = parser.parse_cursor_context(context);

        assert_eq!(trace.messages.len(), 2);
        assert!(warnings.is_empty());
    }
}
