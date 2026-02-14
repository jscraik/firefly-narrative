//! Shared utilities for Story Anchor note formatting.

use sha2::{Digest, Sha256};

pub const NOTE_DIVIDER: &str = "---";

pub fn compute_note_hash(message: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(message.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

/// Split a git note into `(fast_section, json_section)`.
///
/// If there is no divider, JSON section is empty.
pub fn split_note_sections(message: &str) -> (String, String) {
    let mut fast_lines: Vec<&str> = Vec::new();
    let mut json_lines: Vec<&str> = Vec::new();

    let mut in_json = false;
    for line in message.lines() {
        if !in_json && line.trim() == NOTE_DIVIDER {
            in_json = true;
            continue;
        }

        if in_json {
            json_lines.push(line);
        } else {
            fast_lines.push(line);
        }
    }

    (
        fast_lines.join("\n"),
        json_lines.join("\n").trim().to_string(),
    )
}
