//! Story Anchors
//!
//! Narrative-native, Git Notes-backed "story anchors" that travel with commits.
//! This module implements:
//! - Session link notes: refs/notes/narrative/sessions
//! - Hook installer (per-repo .git/hooks)
//! - Migration helpers for legacy note refs
//! - Rewrite reconciliation (patch-id based recovery)

pub mod commands;
pub mod hooks;
pub mod lineage;
pub mod notes_format;
pub mod refs;
pub mod sessions_notes;
pub mod sessions_notes_io;
pub mod status;
