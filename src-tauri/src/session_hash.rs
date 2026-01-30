//! Session hash generation for attribution compatibility
//!
//! Generates deterministic session IDs using SHA-256 hashing.
//! Format: SHA-256("{tool}:{conversation_id}")[:16]

use sha2::{Digest, Sha256};

/// Generate a session hash compatible with Narrative attribution notes
///
/// Format: SHA-256("{tool}:{conversation_id}")[:16]
///
/// # Arguments
/// * `tool` - The AI tool name (e.g., "cursor", "claude", "codex")
/// * `conversation_id` - The tool's session/conversation ID
///
/// # Returns
/// First 16 hex characters of the SHA-256 hash
///
/// # Examples
/// ```ignore
/// use narrative_desktop_mvp::session_hash::generate_session_hash;
///
/// let hash = generate_session_hash("cursor", "6ef2299e-a67f-432b-aa80-3d2fb4d28999");
/// // Returns deterministic 16-char hex string
/// ```
pub fn generate_session_hash(tool: &str, conversation_id: &str) -> String {
    let input = format!("{}:{}", tool, conversation_id);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();

    // First 16 hex characters
    format!("{:x}", result)[..16].to_string()
}

/// Generate session hash from a full session path
///
/// Extracts the conversation ID from the filename and generates
/// the deterministic hash.
///
/// # Arguments
/// * `tool` - The AI tool name
/// * `path` - Full path to the session file
///
/// # Returns
/// Session hash or "unknown" if filename cannot be extracted
pub fn generate_session_hash_from_path(tool: &str, path: &std::path::Path) -> String {
    let conversation_id = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");

    generate_session_hash(tool, conversation_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_hash_deterministic() {
        let hash1 = generate_session_hash("cursor", "6ef2299e-a67f-432b-aa80-3d2fb4d28999");
        let hash2 = generate_session_hash("cursor", "6ef2299e-a67f-432b-aa80-3d2fb4d28999");

        // Should be deterministic
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 16);
    }

    #[test]
    fn test_session_hash_different_inputs() {
        let hash1 = generate_session_hash("cursor", "session-1");
        let hash2 = generate_session_hash("cursor", "session-2");
        let hash3 = generate_session_hash("claude", "session-1");

        // Different inputs should produce different hashes
        assert_ne!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_session_hash_format() {
        let hash = generate_session_hash("claude", "test-session-123");

        // Should be 16 hex characters
        assert_eq!(hash.len(), 16);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_session_hash_from_path() {
        let path = std::path::Path::new("/home/user/.claude/projects/foo/session-uuid.jsonl");
        let hash = generate_session_hash_from_path("claude", path);

        assert_eq!(hash.len(), 16);
        assert_eq!(hash, generate_session_hash("claude", "session-uuid"));
    }
}
