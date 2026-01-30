//! Session import infrastructure
//!
//! Provides pluggable parsers for different AI coding tools.
//! All parsers implement security scanning before returning data.

pub mod claude_parser;
pub mod commands;
pub mod continue_parser;
pub mod copilot_parser;
pub mod cursor_parser;
pub mod gemini_parser;
pub mod parser;
pub mod path_validator;
pub mod secure_parser;
pub mod tool_sanitizer;

use claude_parser::ClaudeCodeParser;
use continue_parser::ContinueParser;
use copilot_parser::CopilotParser;
use cursor_parser::CursorParser;
use gemini_parser::GeminiParser;
use parser::{ParseError, ParseResult, ParsedSession, SessionParser};

/// Registry of available session parsers
pub struct ParserRegistry {
    parsers: Vec<Box<dyn SessionParser>>,
}

impl ParserRegistry {
    /// Create a new registry with all built-in parsers
    pub fn new() -> Self {
        let mut registry = Self {
            parsers: Vec::new(),
        };

        // Register built-in parsers
        registry.register(Box::new(ClaudeCodeParser));
        registry.register(Box::new(CursorParser));
        registry.register(Box::new(GeminiParser));
        registry.register(Box::new(CopilotParser));
        registry.register(Box::new(ContinueParser));

        registry
    }

    /// Register a custom parser
    pub fn register(&mut self, parser: Box<dyn SessionParser>) {
        self.parsers.push(parser);
    }

    /// Find a parser that can handle the given file
    pub fn find_parser(&self, path: &std::path::Path) -> Option<&dyn SessionParser> {
        self.parsers
            .iter()
            .find(|p| p.can_parse(path))
            .map(|p| p.as_ref())
    }

    /// Parse a file using the appropriate parser
    pub fn parse(&self, path: &std::path::Path) -> ParseResult<ParsedSession> {
        let parser = match self.find_parser(path) {
            Some(p) => p,
            None => return ParseResult::Failure(ParseError::UnsupportedFormat),
        };

        parser.parse(path)
    }
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::new()
    }
}
