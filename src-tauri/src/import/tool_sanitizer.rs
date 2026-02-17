//! Tool call input sanitization
//!
//! AI coding tools often invoke tools with sensitive parameters:
//! - File contents (may contain secrets)
//! - Command arguments (may contain passwords)
//! - Environment variables
//!
//! This module sanitizes tool call inputs before storage,
//! keeping only safe metadata and discarding potentially sensitive content.

use serde_json::Value;

/// Allowlist of tools and their safe parameters
pub struct ToolSanitizer;

/// Tools that are safe to store with full parameters
const ALLOWED_TOOLS: &[&str] = &["readFile", "listDirectory", "searchFiles", "viewFile"];

/// Tools that need parameter sanitization
const SANITIZED_TOOLS: &[&str] = &["writeFile", "runCommand", "execute", "bash"];

impl ToolSanitizer {
    /// Sanitize tool call input before storage
    ///
    /// Returns Some(sanitized_value) if the tool should be stored,
    /// or None if the tool should be discarded entirely.
    pub fn sanitize(tool_name: &str, input: &Value) -> Option<Value> {
        // Check if tool is allowed
        if ALLOWED_TOOLS.contains(&tool_name) {
            // These tools are safe to store as-is
            return Some(input.clone());
        }

        // Check if tool needs sanitization
        if SANITIZED_TOOLS.contains(&tool_name) {
            return Self::sanitize_tool(tool_name, input);
        }

        // Unknown tool - discard for safety
        // This is a conservative default; known tools can be added above
        None
    }

    /// Sanitize specific tool inputs
    fn sanitize_tool(tool_name: &str, input: &Value) -> Option<Value> {
        match tool_name {
            "writeFile" | "viewFile" => Self::sanitize_write_file(input),
            "runCommand" | "execute" | "bash" => Self::sanitize_run_command(input),
            _ => None,
        }
    }

    /// Sanitize writeFile tool - keep path only, discard content
    fn sanitize_write_file(input: &Value) -> Option<Value> {
        let mut sanitized = serde_json::Map::new();

        // Extract file path if present
        let path = input
            .get("path")
            .or_else(|| input.get("file_path"))
            .or_else(|| input.get("filepath"));

        if let Some(p) = path {
            sanitized.insert("path".to_string(), p.clone());
        }

        // Note: We intentionally discard "content" field as it may contain secrets

        if sanitized.is_empty() {
            None
        } else {
            Some(Value::Object(sanitized))
        }
    }

    /// Sanitize runCommand tool - keep command name only, discard args
    fn sanitize_run_command(input: &Value) -> Option<Value> {
        let mut sanitized = serde_json::Map::new();

        // Try to extract command from various input formats
        let command = input.get("command").and_then(|v| v.as_str()).or_else(|| {
            // Some tools pass command as array
            input
                .get("command")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.first())
                .and_then(|v| v.as_str())
        });

        if let Some(cmd) = command {
            // Extract just the command name (first word)
            let cmd_name = cmd.split_whitespace().next().unwrap_or("unknown");

            sanitized.insert("command".to_string(), Value::String(cmd_name.to_string()));
        }

        // Note: We intentionally discard arguments as they may contain secrets

        if sanitized.is_empty() {
            None
        } else {
            Some(Value::Object(sanitized))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_allows_safe_tools() {
        let input = json!({"path": "/home/user/file.txt"});
        let result = ToolSanitizer::sanitize("readFile", &input);

        assert_eq!(result, Some(input));
    }

    #[test]
    fn test_sanitizes_write_file() {
        let input = json!({
            "path": "/home/user/file.txt",
            "content": "secret_api_key = 'sk-12345'"
        });
        let result = ToolSanitizer::sanitize("writeFile", &input);

        // Should keep path but discard content
        let expected = json!({"path": "/home/user/file.txt"});
        assert_eq!(result, Some(expected));
    }

    #[test]
    fn test_sanitizes_run_command() {
        let input = json!({
            "command": "curl -H 'Authorization: Bearer secret-token' https://api.example.com" // gitleaks:allow
        });
        let result = ToolSanitizer::sanitize("runCommand", &input);

        // Should keep only command name
        let expected = json!({"command": "curl"});
        assert_eq!(result, Some(expected));
    }

    #[test]
    fn test_discards_unknown_tools() {
        let input = json!({"data": "sensitive"});
        let result = ToolSanitizer::sanitize("unknownTool", &input);

        assert_eq!(result, None);
    }

    #[test]
    fn test_write_file_alternate_field_names() {
        // Test file_path variant
        let input = json!({"file_path": "/path/to/file"});
        let result = ToolSanitizer::sanitize("writeFile", &input);

        assert!(result.is_some());
        assert!(result.unwrap()["path"].is_string());
    }
}
