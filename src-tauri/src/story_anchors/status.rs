//! Status helpers for Story Anchors.

use crate::story_anchors::refs::{
    ATTRIBUTION_REF_CANONICAL, LINEAGE_REF_CANONICAL, SESSIONS_REF_CANONICAL,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryAnchorCommitStatus {
    pub commit_sha: String,
    pub has_attribution_note: bool,
    pub has_sessions_note: bool,
    pub has_lineage_note: bool,
    pub attribution_ref: Option<String>,
    pub sessions_ref: Option<String>,
    pub lineage_ref: Option<String>,
    pub attribution_schema_version: Option<String>,
    pub sessions_schema_version: Option<String>,
    pub lineage_schema_version: Option<String>,
}

pub async fn get_commit_story_anchor_status(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> StoryAnchorCommitStatus {
    // story_anchor_note_meta is keyed by (repo_id, commit_sha, note_kind, note_ref)
    let rows: Vec<(String, String, Option<String>)> = sqlx::query_as(
        r#"
        SELECT note_kind, note_ref, schema_version
        FROM story_anchor_note_meta
        WHERE repo_id = ? AND commit_sha = ?
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let mut out = StoryAnchorCommitStatus {
        commit_sha: commit_sha.to_string(),
        has_attribution_note: false,
        has_sessions_note: false,
        has_lineage_note: false,
        attribution_ref: None,
        sessions_ref: None,
        lineage_ref: None,
        attribution_schema_version: None,
        sessions_schema_version: None,
        lineage_schema_version: None,
    };

    for (kind, note_ref, schema_version) in rows {
        match kind.as_str() {
            "attribution" => {
                out.has_attribution_note = true;
                out.attribution_ref = Some(note_ref);
                out.attribution_schema_version = schema_version;
            }
            "sessions" => {
                out.has_sessions_note = true;
                out.sessions_ref = Some(note_ref);
                out.sessions_schema_version = schema_version;
            }
            "lineage" => {
                out.has_lineage_note = true;
                out.lineage_ref = Some(note_ref);
                out.lineage_schema_version = schema_version;
            }
            _ => {}
        }
    }

    // If we have no cached meta, still provide canonical refs as hints.
    if out.attribution_ref.is_none() {
        out.attribution_ref = Some(ATTRIBUTION_REF_CANONICAL.to_string());
    }
    if out.sessions_ref.is_none() {
        out.sessions_ref = Some(SESSIONS_REF_CANONICAL.to_string());
    }
    if out.lineage_ref.is_none() {
        out.lineage_ref = Some(LINEAGE_REF_CANONICAL.to_string());
    }

    out
}
