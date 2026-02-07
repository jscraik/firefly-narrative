//! Git Notes refs + schema versions for Story Anchors.

// Canonical Narrative refs (write targets)
pub const ATTRIBUTION_REF_CANONICAL: &str = "refs/notes/narrative/attribution";
pub const SESSIONS_REF_CANONICAL: &str = "refs/notes/narrative/sessions";
pub const LINEAGE_REF_CANONICAL: &str = "refs/notes/narrative/lineage";

// Compatibility refs (read/import only unless migrating)
pub const ATTRIBUTION_REF_LEGACY_NARRATIVE: &str = "refs/notes/narrative-attribution";

// Schema versions
pub const ATTRIBUTION_SCHEMA_VERSION: &str = "narrative/attribution/1.0.0";
pub const SESSIONS_SCHEMA_VERSION: &str = "narrative/sessions/1.0.0";
pub const LINEAGE_SCHEMA_VERSION: &str = "narrative/lineage/1.0.0";

pub fn attribution_import_refs_precedence() -> [&'static str; 2] {
    [ATTRIBUTION_REF_CANONICAL, ATTRIBUTION_REF_LEGACY_NARRATIVE]
}
