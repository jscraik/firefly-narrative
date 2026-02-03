//! App-level ingest configuration (non-committable).
//!
//! Stored in the app data directory alongside the SQLite cache.

use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestConfig {
    pub auto_ingest_enabled: bool,
    pub watch_paths: WatchPaths,
    pub codex: CodexConfig,
    pub retention_days: i64,
    pub redaction_mode: String,
    pub consent: ConsentState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchPaths {
    pub claude: Vec<String>,
    pub cursor: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexConfig {
    pub receiver_enabled: bool,
    pub endpoint: String,
    pub header_env_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsentState {
    pub codex_telemetry_granted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub granted_at_iso: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestConfigUpdate {
    pub auto_ingest_enabled: Option<bool>,
    pub watch_paths: Option<WatchPaths>,
    pub codex: Option<CodexConfig>,
    pub retention_days: Option<i64>,
    pub redaction_mode: Option<String>,
    pub consent: Option<ConsentState>,
}

impl Default for IngestConfig {
    fn default() -> Self {
        Self {
            auto_ingest_enabled: false,
            watch_paths: WatchPaths {
                claude: vec!["~/.claude/projects".to_string()],
                cursor: vec![
                    "~/.cursor/composer".to_string(),
                    "/Users/jamiecraik/.cursor/ai-tracking".to_string(),
                ],
            },
            codex: CodexConfig {
                receiver_enabled: false,
                endpoint: "http://127.0.0.1:4318/v1/logs".to_string(),
                header_env_key: "NARRATIVE_OTEL_API_KEY".to_string(),
            },
            retention_days: 30,
            redaction_mode: "redact".to_string(),
            consent: ConsentState {
                codex_telemetry_granted: false,
                granted_at_iso: None,
            },
        }
    }
}

pub fn load_config() -> Result<IngestConfig, String> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(IngestConfig::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed = serde_json::from_str::<IngestConfig>(&raw).map_err(|e| e.to_string())?;
    Ok(parsed)
}

pub fn save_config(config: &IngestConfig) -> Result<(), String> {
    let path = config_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn apply_update(update: IngestConfigUpdate) -> Result<IngestConfig, String> {
    let mut config = load_config().unwrap_or_default();

    if let Some(value) = update.auto_ingest_enabled {
        config.auto_ingest_enabled = value;
    }
    if let Some(value) = update.watch_paths {
        config.watch_paths = value;
    }
    if let Some(value) = update.codex {
        config.codex = value;
    }
    if let Some(value) = update.retention_days {
        config.retention_days = value;
    }
    if let Some(value) = update.redaction_mode {
        config.redaction_mode = value;
    }
    if let Some(value) = update.consent {
        config.consent = value;
    }

    save_config(&config)?;
    Ok(config)
}

pub fn config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home.join("Library/Application Support/com.jamie.narrative-mvp/ingest-config.json"))
}

#[command(rename_all = "camelCase")]
pub fn get_ingest_config() -> Result<IngestConfig, String> {
    load_config()
}

#[command(rename_all = "camelCase")]
pub fn set_ingest_config(update: IngestConfigUpdate) -> Result<IngestConfig, String> {
    apply_update(update)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OtlpEnvStatus {
    pub present: bool,
    pub key_name: String,
}

#[command(rename_all = "camelCase")]
pub fn get_otlp_env_status() -> Result<OtlpEnvStatus, String> {
    let config = load_config().unwrap_or_default();
    let key = config.codex.header_env_key;
    let present = std::env::var(&key).ok().map(|v| !v.is_empty()).unwrap_or(false);
    Ok(OtlpEnvStatus {
        present,
        key_name: key,
    })
}

#[command(rename_all = "camelCase")]
pub fn configure_codex_otel(endpoint: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let config_dir = home.join(".codex");
    let config_path = config_dir.join("config.toml");
    let backup_path = config_dir.join("config.toml.narrative.bak");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let existing = if config_path.exists() {
        fs::read_to_string(&config_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    if !existing.is_empty() {
        fs::write(&backup_path, &existing).map_err(|e| e.to_string())?;
    }

    let header_env = "NARRATIVE_OTEL_API_KEY";
    let otel_block = format!(
        "[otel]\nexporter = {{ otlp-http = {{ endpoint = \"{}\", protocol = \"json\", headers = {{ \"x-otlp-api-key\" = \"${{{}}}\" }} }} }}\nlog_user_prompt = false\n",
        endpoint, header_env
    );

    let updated = upsert_otel_block(&existing, &otel_block);
    fs::write(&config_path, updated).map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_otel_block(existing: &str, block: &str) -> String {
    if existing.trim().is_empty() {
        return format!("{block}\n");
    }

    let lines = existing.lines().collect::<Vec<_>>();
    let mut out = Vec::new();
    let mut in_otel = false;
    let mut otel_written = false;

    for (idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            if in_otel && !otel_written {
                out.push(block.trim_end());
                otel_written = true;
            }
            in_otel = trimmed == "[otel]";
        }

        if in_otel {
            // Skip existing otel lines; we'll replace with block.
            if idx + 1 < lines.len() {
                let next = lines[idx + 1].trim();
                if next.starts_with('[') && next.ends_with(']') {
                    out.push(block.trim_end());
                    otel_written = true;
                }
            }
            continue;
        }

        out.push(*line);
    }

    if !otel_written {
        if !out.is_empty() && !out.last().unwrap_or(&"").is_empty() {
            out.push("");
        }
        out.push(block.trim_end());
    }

    out.join("\n") + "\n"
}
