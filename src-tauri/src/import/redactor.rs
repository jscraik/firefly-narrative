//! Redaction utilities for auto-ingested sessions.
//!
//! Uses lightweight regex patterns to replace likely secrets with safe tokens.

use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct RedactionHit {
    pub kind: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct RedactionSummary {
    pub total: usize,
    pub hits: Vec<RedactionHit>,
}

lazy_static! {
    static ref REDACTION_PATTERNS: Vec<(Regex, String)> = {
        let raw = include_str!("../../../src/shared/redaction-patterns.json");
        let patterns: Vec<RedactionPatternConfig> =
            serde_json::from_str(raw).expect("valid redaction pattern json");

        patterns
            .into_iter()
            .map(|pattern| {
                let regex = Regex::new(&pattern.pattern)
                    .unwrap_or_else(|_| panic!("valid redaction regex: {}", pattern.kind));
                (regex, pattern.kind)
            })
            .collect()
    };
}

const REDACTION_TOKEN_PREFIX: &str = "⟦REDACTED:";
const REDACTION_TOKEN_SUFFIX: &str = "⟧";

pub fn redact_text(input: &str) -> (String, RedactionSummary) {
    let mut redacted = input.to_string();
    let mut hits = Vec::new();
    let mut total = 0;

    for (pattern, name) in REDACTION_PATTERNS.iter() {
        let matches = pattern.find_iter(&redacted).count();
        if matches == 0 {
            continue;
        }
        total += matches;
        hits.push(RedactionHit {
            kind: name.to_string(),
            count: matches,
        });
        let replacement = format!("{REDACTION_TOKEN_PREFIX}{name}{REDACTION_TOKEN_SUFFIX}");
        redacted = pattern.replace_all(&redacted, replacement).to_string();
    }

    (redacted, RedactionSummary { total, hits })
}

pub fn redact_value(value: &Value) -> (Value, RedactionSummary) {
    match value {
        Value::String(text) => {
            let (redacted, summary) = redact_text(text);
            (Value::String(redacted), summary)
        }
        Value::Array(items) => {
            let mut total = 0;
            let mut hits = Vec::new();
            let mut redacted_items = Vec::with_capacity(items.len());
            for item in items {
                let (redacted, summary) = redact_value(item);
                total += summary.total;
                merge_hits(&mut hits, summary.hits);
                redacted_items.push(redacted);
            }
            (
                Value::Array(redacted_items),
                RedactionSummary { total, hits },
            )
        }
        Value::Object(map) => {
            let mut total = 0;
            let mut hits = Vec::new();
            let mut redacted_map = serde_json::Map::new();
            for (key, item) in map {
                let (redacted, summary) = redact_value(item);
                total += summary.total;
                merge_hits(&mut hits, summary.hits);
                redacted_map.insert(key.clone(), redacted);
            }
            (
                Value::Object(redacted_map),
                RedactionSummary { total, hits },
            )
        }
        _ => (
            value.clone(),
            RedactionSummary {
                total: 0,
                hits: vec![],
            },
        ),
    }
}

fn merge_hits(target: &mut Vec<RedactionHit>, incoming: Vec<RedactionHit>) {
    for hit in incoming {
        if let Some(existing) = target.iter_mut().find(|h| h.kind == hit.kind) {
            existing.count += hit.count;
        } else {
            target.push(hit);
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
struct RedactionPatternConfig {
    kind: String,
    pattern: String,
    #[allow(dead_code)]
    flags: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_redact_openai_key() {
        let input = "My API key is sk-abc123xyz789foo456bar789baz01234567890";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:OPENAI_KEY⟧"));
        assert!(!redacted.contains("sk-abc123"));
        assert_eq!(summary.total, 1);
        assert_eq!(summary.hits[0].kind, "OPENAI_KEY");
    }

    #[test]
    fn test_redact_github_token() {
        let input = "Authorization: token ghp_abcdefghijklmnopqrstuvwxyz12"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:GITHUB_TOKEN⟧"));
        assert!(!redacted.contains("ghp_"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_aws_key() {
        let input = "Access key: AKIAIOSFODNN7EXAMPLE"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:AWS_ACCESS_KEY⟧"));
        assert!(!redacted.contains("AKIAIOSFODNN7EXAMPLE"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_private_key() {
        let input =
            "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:PRIVATE_KEY_BLOCK⟧"));
        assert!(!redacted.contains("BEGIN RSA PRIVATE KEY"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_bearer_token() {
        let input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:BEARER_TOKEN⟧"));
        assert!(!redacted.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_multiple_secrets() {
        let input = "OpenAI: sk-abc123xyz789foo456bar789baz01234567890\nGitHub: ghp_abcdefghijklmnopqrstuvwxyz12"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:OPENAI_KEY⟧"));
        assert!(redacted.contains("⟦REDACTED:GITHUB_TOKEN⟧"));
        assert_eq!(summary.total, 2);
    }

    #[test]
    fn test_no_false_positives() {
        let input = "This is a normal conversation about skiing and asking questions.";
        let (redacted, summary) = redact_text(input);

        assert_eq!(redacted, input);
        assert_eq!(summary.total, 0);
    }

    #[test]
    fn test_redact_json_value() {
        let value = json!({
            "message": "API key: sk-abc123xyz789foo456bar789baz01234567890", // gitleaks:allow
            "nested": {
                "token": "ghp_abcdefghijklmnopqrstuvwxyz12" // gitleaks:allow
            }
        });

        let (redacted, summary) = redact_value(&value);

        let redacted_str = redacted.to_string();
        assert!(redacted_str.contains("⟦REDACTED:OPENAI_KEY⟧"));
        assert!(redacted_str.contains("⟦REDACTED:GITHUB_TOKEN⟧"));
        assert_eq!(summary.total, 2);
    }

    #[test]
    fn test_redact_json_array() {
        let value = json!([
            "sk-abc123xyz789foo456bar789baz01234567890", // gitleaks:allow
            "normal text",
            "ghp_abcdefghijklmnopqrstuvwxyz12" // gitleaks:allow
        ]);

        let (redacted, summary) = redact_value(&value);

        let redacted_str = redacted.to_string();
        assert!(redacted_str.contains("⟦REDACTED:OPENAI_KEY⟧"));
        assert!(redacted_str.contains("⟦REDACTED:GITHUB_TOKEN⟧"));
        assert!(redacted_str.contains("normal text"));
        assert_eq!(summary.total, 2);
    }

    #[test]
    fn test_redact_stripe_key() {
        // Use obviously fake test data to avoid GitHub secret scanning
        // Pattern: sk_live_[24+ chars] - using all 'a's (not a real key format)
        let input = "Stripe key: sk_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:STRIPE_KEY⟧"));
        assert!(!redacted.contains("sk_live_"));
        assert_eq!(summary.total, 1);
        assert!(summary.hits.iter().any(|h| h.kind == "STRIPE_KEY"));
    }

    #[test]
    fn test_redact_slack_token() {
        // Use obviously fake test data to avoid GitHub secret scanning
        // Pattern: xoxb-[10+ chars] - using all 'a's (not a real token format)
        let input = "Slack bot token: xoxb-aaaaaaaaaaaaaaaaaaaa"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:SLACK_TOKEN⟧"));
        assert!(!redacted.contains("xoxb-"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_npm_token() {
        let input = "NPM token: npm_abc123def456ghi789jkl012mno345pqr678"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:NPM_TOKEN⟧"));
        assert!(!redacted.contains("npm_"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_jwt_token() {
        let input = "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:JWT_TOKEN⟧"));
        assert!(!redacted.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_database_url() {
        let input = "DATABASE_URL=postgres://user:secret_password@localhost:5432/mydb";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:DATABASE_URL⟧"));
        assert!(!redacted.contains("secret_password"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_sendgrid_key() {
        let input =
            "SendGrid key: SG.aaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:SENDGRID_KEY⟧"));
        assert!(!redacted.contains("SG."));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_twilio_sid() {
        // Use obviously fake test data to avoid GitHub secret scanning
        // Pattern: AC[32 hex chars] - using all 'a's (valid hex, obviously fake)
        let input = "Twilio SID: ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:TWILIO_SID⟧"));
        assert!(!redacted.contains("ACaaaaaaaa"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_google_api_key() {
        let input = "Google API key: AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:GOOGLE_API_KEY⟧"));
        assert!(!redacted.contains("AIza"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_password_assignment() {
        let input = "password = 'super_secret_password_123'";
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:PASSWORD_ASSIGNMENT⟧"));
        assert!(!redacted.contains("super_secret_password_123"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_redact_api_key_assignment() {
        let input = "api_key: 'my_private_api_key_xyz789'"; // gitleaks:allow
        let (redacted, summary) = redact_text(input);

        assert!(redacted.contains("⟦REDACTED:PASSWORD_ASSIGNMENT⟧"));
        assert!(!redacted.contains("my_private_api_key_xyz789"));
        assert_eq!(summary.total, 1);
    }

    #[test]
    fn test_empty_input() {
        let input = "";
        let (redacted, summary) = redact_text(input);

        assert_eq!(redacted, "");
        assert_eq!(summary.total, 0);
        assert!(summary.hits.is_empty());
    }

    #[test]
    fn test_many_secrets_in_one() {
        // Use obviously fake test data to avoid GitHub secret scanning
        let input = r#"
            OpenAI: sk-abc123xyz789foo456bar789baz01234567890
            GitHub: ghp_abcdefghijklmnopqrstuvwxyz12 // gitleaks:allow
            AWS: AKIAIOSFODNN7EXAMPLE // gitleaks:allow
            Stripe: sk_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa // gitleaks:allow
            Slack: xoxb-aaaaaaaaaaaaaaaaaaaa // gitleaks:allow
            JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U // gitleaks:allow
            DB: postgres://user:pass@host/db
        "#;

        let (redacted, summary) = redact_text(input);

        // All secrets should be redacted
        assert!(redacted.contains("⟦REDACTED:OPENAI_KEY⟧"));
        assert!(redacted.contains("⟦REDACTED:GITHUB_TOKEN⟧"));
        assert!(redacted.contains("⟦REDACTED:AWS_ACCESS_KEY⟧"));
        assert!(redacted.contains("⟦REDACTED:STRIPE_KEY⟧"));
        assert!(redacted.contains("⟦REDACTED:SLACK_TOKEN⟧"));
        assert!(redacted.contains("⟦REDACTED:JWT_TOKEN⟧"));
        assert!(redacted.contains("⟦REDACTED:DATABASE_URL⟧"));

        // Total count should be 7
        assert_eq!(summary.total, 7);
    }
}
