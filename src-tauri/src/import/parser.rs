//! Parser trait and result types for session import

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Result of a parse attempt with support for partial success
pub enum ParseResult<T> {
    /// Complete success, no warnings
    Success(T),
    /// Partial success with warnings (e.g., some lines failed, secrets detected)
    Partial(T, Vec<ParseWarning>),
    /// Complete failure
    Failure(ParseError),
}

/// Warning levels for parse issues
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum WarningSeverity {
    /// Informational, no action needed
    Info,
    /// Warning, import continued but user should review
    Warning,
    /// Security issue detected, requires user confirmation
    Security,
}

/// A warning from the parser
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseWarning {
    pub severity: WarningSeverity,
    pub message: String,
    pub context: Option<String>, // e.g., "line 42", "field 'content'"
}

/// Errors that can occur during parsing
#[derive(Debug)]
pub enum ParseError {
    Io(std::io::Error),
    Json(serde_json::Error),
    UnsupportedFormat,
    FileTooLarge,
    #[allow(dead_code)]
    MissingField(&'static str),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::Io(e) => write!(f, "I/O error: {}", e),
            ParseError::Json(e) => write!(f, "JSON parse error: {}", e),
            ParseError::UnsupportedFormat => write!(f, "Unsupported file format"),
            ParseError::FileTooLarge => write!(f, "File too large (max 100MB)"),
            ParseError::MissingField(field) => write!(f, "Missing required field: {}", field),
        }
    }
}

impl std::error::Error for ParseError {}

impl From<std::io::Error> for ParseError {
    fn from(e: std::io::Error) -> Self {
        ParseError::Io(e)
    }
}

impl From<serde_json::Error> for ParseError {
    fn from(e: serde_json::Error) -> Self {
        ParseError::Json(e)
    }
}

/// Trait for session parsers
///
/// Implement this trait to add support for a new AI coding tool.
/// The parser should:
/// 1. Validate file paths (security)
/// 2. Scan for secrets (security)
/// 3. Handle parse errors gracefully (reliability)
/// 4. Return structured data with warnings
pub trait SessionParser: Send + Sync {
    /// Check if this parser can handle the given file
    ///
    /// Should check:
    /// - File extension
    /// - Path patterns (e.g., contains ".claude")
    /// - Magic numbers or headers (if applicable)
    fn can_parse(&self, path: &Path) -> bool;

    /// Parse a session file into our internal format
    ///
    /// Implementations should:
    /// 1. Validate path with PathValidator
    /// 2. Check file size limits
    /// 3. Scan content with SecretScanner
    /// 4. Continue on recoverable errors, collecting warnings
    /// 5. Return Partial result if warnings exist
    fn parse(&self, path: &Path) -> ParseResult<ParsedSession>;
}

/// Origin information for a session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionOrigin {
    /// The AI tool (claude_code, cursor, etc.)
    pub tool: String,
    /// Deterministic session hash (SHA-256[:16])
    pub session_id: String,
    /// Original conversation ID from the tool
    pub conversation_id: String,
    /// AI model used (claude-4-opus, gpt-4o, etc.)
    pub model: Option<String>,
}

/// A message in a session trace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role", rename_all = "snake_case")]
pub enum TraceMessage {
    User {
        text: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<String>,
    },
    Assistant {
        text: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<String>,
    },
    Thinking {
        text: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<String>,
    },
    Plan {
        text: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<String>,
    },
    ToolCall {
        tool_name: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        input: Option<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<String>,
    },
}

/// Complete trace of a coding session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTrace {
    pub messages: Vec<TraceMessage>,
}

impl SessionTrace {
    pub fn new() -> Self {
        Self {
            messages: Vec::new(),
        }
    }

    pub fn add_message(&mut self, message: TraceMessage) {
        self.messages.push(message);
    }
}

impl Default for SessionTrace {
    fn default() -> Self {
        Self::new()
    }
}

/// A parsed session ready for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSession {
    pub origin: SessionOrigin,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<chrono::DateTime<chrono::Utc>>,
    pub trace: SessionTrace,
    pub files_touched: Vec<String>,
}

impl ParsedSession {
    /// Get total message count
    pub fn message_count(&self) -> usize {
        self.trace.messages.len()
    }
}
