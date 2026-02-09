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
