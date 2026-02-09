use serde::{Deserialize, Serialize};

pub const ATLAS_DERIVED_VERSION: &str = "atlas/0.1.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AtlasErrorCode {
    BudgetQueryTooLong,
    BudgetTooManyTerms,
    BudgetLimitTooHigh,
    BudgetResponseTooLarge,
    BudgetSessionIdTooLong,
    BudgetMaxChunksTooHigh,
    FtsNotAvailable,
    InvalidQuery,
    RepoNotFound,
    SessionNotFound,
    Internal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasError {
    pub code: AtlasErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasEnvelope<T> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<AtlasError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<AtlasMeta>,
}

impl<T> AtlasEnvelope<T> {
    pub fn ok(value: T) -> Self {
        Self {
            ok: true,
            value: Some(value),
            error: None,
            meta: None,
        }
    }

    pub fn ok_with_meta(value: T, meta: AtlasMeta) -> Self {
        Self {
            ok: true,
            value: Some(value),
            error: None,
            meta: Some(meta),
        }
    }

    pub fn err(code: AtlasErrorCode, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            value: None,
            error: Some(AtlasError {
                code,
                message: message.into(),
            }),
            meta: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasBudgets {
    pub query_max_chars: u32,
    pub query_max_terms: u32,
    pub limit_max: u32,
    pub snippet_max_chars: u32,
    pub chunk_text_max_chars: u32,
    pub get_session_max_chunks: u32,
    pub response_max_chars: u32,
}
