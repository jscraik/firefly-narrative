//! Secret scanning and security utilities for session import

use lazy_static::lazy_static;
use regex::Regex;

/// A detected potential secret
#[derive(Debug, Clone)]
pub struct SecretFinding {
    /// Type of secret (e.g., "OpenAI API key")
    pub kind: String,
}

/// Secret patterns for pre-import scanning
pub struct SecretScanner;

lazy_static! {
    /// Patterns that indicate potential secrets
    ///
    /// SECURITY NOTE: These patterns are designed to catch common secrets
    /// while minimizing false positives. They should be regularly reviewed
    /// and updated as new secret formats emerge.
    static ref SECRET_PATTERNS: Vec<(Regex, &'static str)> = {
        vec![
            // OpenAI API keys
            (Regex::new(r"\bsk-[a-zA-Z0-9]{20,48}\b").unwrap(), "OpenAI API key"),

            // Stripe keys
            (Regex::new(r"\bpk_(live|test)_[a-zA-Z0-9]{20,}\b").unwrap(), "Stripe publishable key"),
            (Regex::new(r"\bsk_(live|test)_[a-zA-Z0-9]{20,}\b").unwrap(), "Stripe secret key"),

            // GitHub tokens (new format)
            (Regex::new(r"\bgh[pousr]_[A-Za-z0-9_]{36,}\b").unwrap(), "GitHub token"),

            // AWS keys
            (Regex::new(r"\bAKIA[0-9A-Z]{16}\b").unwrap(), "AWS access key ID"),

            // Generic high-entropy strings (potential secrets)
            // This pattern matches long alphanumeric strings that could be API keys
            // It's intentionally broad and will have false positives
            (Regex::new(r"\b[a-zA-Z0-9_\-]{32,64}\b").unwrap(), "Possible secret (high entropy)"),
        ]
    };

    /// Patterns that are definitely NOT secrets (false positive filters)
    static ref FALSE_POSITIVE_PATTERNS: Vec<(Regex, &'static str)> = {
        vec![
            // UUIDs - common, not secrets
            (Regex::new(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap(), "UUID"),

            // SHA-1 hashes (40 hex chars)
            (Regex::new(r"^[0-9a-f]{40}$").unwrap(), "SHA-1 hash"),

            // SHA-256 hashes (64 hex chars)
            (Regex::new(r"^[0-9a-f]{64}$").unwrap(), "SHA-256 hash"),

            // Git commit SHAs (short and long)
            (Regex::new(r"^[0-9a-f]{7,40}$").unwrap(), "Git SHA"),

            // Common variable names that match length patterns
            (Regex::new(r"^(undefined|null|true|false)$").unwrap(), "JavaScript keyword"),
        ]
    };
}

impl SecretScanner {
    /// Scan text for potential secrets
    ///
    /// Returns a list of findings. Empty list means no secrets detected.
    /// Note: This may return false positives. Use `is_likely_secret` for filtering.
    pub fn scan(text: &str) -> Vec<SecretFinding> {
        let mut findings = Vec::new();

        for (pattern, name) in SECRET_PATTERNS.iter() {
            for mat in pattern.find_iter(text) {
                let matched_text = mat.as_str();

                // Filter out known false positives
                if Self::is_false_positive(matched_text) {
                    continue;
                }

                findings.push(SecretFinding {
                    kind: name.to_string(),
                });
            }
        }

        findings
    }

    /// Check if a matched string is a known false positive
    fn is_false_positive(text: &str) -> bool {
        FALSE_POSITIVE_PATTERNS
            .iter()
            .any(|(pattern, _)| pattern.is_match(text))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detects_openai_key() {
        let text = "Error: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx2";
        let findings = SecretScanner::scan(text);

        assert!(!findings.is_empty());
        assert!(findings[0].kind.contains("OpenAI"));
    }

    #[test]
    fn test_detects_github_token() {
        let text = "token ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        let findings = SecretScanner::scan(text);

        assert!(!findings.is_empty());
        assert!(findings[0].kind.contains("GitHub"));
    }

    #[test]
    fn test_ignores_uuid() {
        let text = "session-id: 550e8400-e29b-41d4-a716-446655440000";
        let findings = SecretScanner::scan(text);

        // Should filter out UUID as false positive
        // Note: May still find other patterns, so we check it's not detected as the 32-char pattern
        let uuid_findings: Vec<_> = findings
            .iter()
            .filter(|f| f.kind.contains("Possible secret"))
            .collect();

        assert!(
            uuid_findings.is_empty(),
            "UUID should be filtered as false positive"
        );
    }

    #[test]
    fn test_ignores_git_sha() {
        let text = "commit abc123def45678901234567890123456789012";
        let findings = SecretScanner::scan(text);

        // Git SHAs should not be flagged as secrets
        let sha_findings: Vec<_> = findings
            .iter()
            .filter(|f| f.kind.contains("Possible secret"))
            .collect();

        assert!(
            sha_findings.is_empty(),
            "Git SHA should be filtered as false positive"
        );
    }
}
