use crate::import::parser::TraceMessage;
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

use super::types::ATLAS_DERIVED_VERSION;

pub const CHUNK_TEXT_MAX_CHARS: usize = 4_000;
pub const MAX_CHUNKS_PER_SESSION: usize = 200;

#[derive(Debug, Clone)]
pub struct DerivedChunk {
    pub chunk_uid: String,
    pub chunk_index: i64,
    pub start_message_index: i64,
    pub end_message_index: i64,
    pub role_mask: String,
    pub text: String,
}

#[derive(Debug, Clone, Default)]
pub struct DeriveSummary {
    pub chunks: Vec<DerivedChunk>,
    pub truncated: bool,
}

pub fn derive_chunks(repo_id: i64, session_id: &str, messages: &[TraceMessage]) -> DeriveSummary {
    let mut out: Vec<DerivedChunk> = Vec::new();
    let mut truncated = false;

    let mut current: Vec<(i64, String, &'static str)> = Vec::new();
    let mut current_len: usize = 0;

    for (idx, msg) in messages.iter().enumerate() {
        let idx = idx as i64;
        let (role, text) = message_to_index_text(msg);
        let text = normalize_text(&text);
        if text.is_empty() {
            continue;
        }

        let text = truncate_chars(&text, CHUNK_TEXT_MAX_CHARS);

        // Cost: include a separator if we already have content.
        let additional = if current.is_empty() {
            text.len()
        } else {
            2 + text.len()
        };

        if !current.is_empty() && current_len + additional > CHUNK_TEXT_MAX_CHARS {
            if out.len() >= MAX_CHUNKS_PER_SESSION {
                truncated = true;
                break;
            }
            out.push(finalize_chunk(
                repo_id,
                session_id,
                out.len() as i64,
                &current,
            ));
            current.clear();
            current_len = 0;
        }

        current_len += additional;
        current.push((idx, text, role));
    }

    if !current.is_empty() && out.len() < MAX_CHUNKS_PER_SESSION {
        out.push(finalize_chunk(
            repo_id,
            session_id,
            out.len() as i64,
            &current,
        ));
    } else if !current.is_empty() {
        truncated = true;
    }

    DeriveSummary {
        chunks: out,
        truncated,
    }
}

fn message_to_index_text(msg: &TraceMessage) -> (&'static str, String) {
    match msg {
        TraceMessage::User { text, .. } => ("user", format!("[USER]\\n{text}")),
        TraceMessage::Assistant { text, .. } => ("assistant", format!("[ASSISTANT]\\n{text}")),
        TraceMessage::Thinking { text, .. } => ("thinking", format!("[THINKING]\\n{text}")),
        TraceMessage::Plan { text, .. } => ("plan", format!("[PLAN]\\n{text}")),
        TraceMessage::ToolCall {
            tool_name, input, ..
        } => {
            let input_text = input
                .as_ref()
                .and_then(|value| (!value.is_null()).then(|| value.to_string()))
                .unwrap_or_default();
            let joined = if input_text.is_empty() {
                format!("[TOOL_CALL]\\n{tool_name}")
            } else {
                format!("[TOOL_CALL]\\n{tool_name}\\n{input_text}")
            };
            ("tool_call", joined)
        }
    }
}

fn finalize_chunk(
    repo_id: i64,
    session_id: &str,
    chunk_index: i64,
    items: &[(i64, String, &'static str)],
) -> DerivedChunk {
    let start_message_index = items.first().map(|(i, _, _)| *i).unwrap_or(0);
    let end_message_index = items
        .last()
        .map(|(i, _, _)| *i)
        .unwrap_or(start_message_index);

    let mut roles: BTreeSet<&'static str> = BTreeSet::new();
    for (_, _, role) in items {
        roles.insert(*role);
    }
    let role_mask = roles.into_iter().collect::<Vec<_>>().join(",");

    let mut text = String::new();
    for (_, piece, _) in items {
        if !text.is_empty() {
            text.push_str("\\n\\n");
        }
        text.push_str(piece);
    }

    let chunk_uid = derive_chunk_uid(
        repo_id,
        session_id,
        chunk_index,
        start_message_index,
        end_message_index,
        &text,
    );

    DerivedChunk {
        chunk_uid,
        chunk_index,
        start_message_index,
        end_message_index,
        role_mask,
        text,
    }
}

fn derive_chunk_uid(
    repo_id: i64,
    session_id: &str,
    chunk_index: i64,
    start_message_index: i64,
    end_message_index: i64,
    text: &str,
) -> String {
    let text_hash = sha256_hex(text.as_bytes());
    let canonical = format!(
        "atl|{ATLAS_DERIVED_VERSION}|repo:{repo_id}|session:{session_id}|chunk:{chunk_index}|msgs:{start_message_index}-{end_message_index}|text:{text_hash}"
    );
    let full = sha256_hex(canonical.as_bytes());
    let short = &full[..24.min(full.len())];
    format!("atl_{short}")
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let out = hasher.finalize();
    format!("{:x}", out)
}

fn normalize_text(input: &str) -> String {
    input.replace("\\r\\n", "\\n").trim().to_string()
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
    if input.chars().count() <= max_chars {
        return input.to_string();
    }
    input.chars().take(max_chars).collect()
}
