//! App-level ingest configuration (non-committable).
//!
//! Stored in the app data directory alongside the SQLite cache.

use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::command;

use crate::secret_store;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestConfig {
    #[serde(default)]
    pub auto_ingest_enabled: bool,
    #[serde(default)]
    pub watch_paths: WatchPaths,
    #[serde(default)]
    pub codex: CodexConfig,
    #[serde(default)]
    pub retention_days: i64,
    #[serde(default)]
    pub redaction_mode: String,
    #[serde(default)]
    pub consent: ConsentState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchPaths {
    #[serde(default)]
    pub claude: Vec<String>,
    #[serde(default)]
    pub cursor: Vec<String>,
    #[serde(default)]
    pub codex_logs: Vec<String>,
}

impl Default for WatchPaths {
    fn default() -> Self {
        Self {
            claude: vec!["~/.claude/projects".to_string()],
            // Cursor stores composer sessions in ~/.cursor/composer/composer.database.
            // Watching the entire ~/.cursor tree is noisy (many non-session JSON files).
            cursor: vec!["~/.cursor/composer".to_string()],
            // Codex sessions can be stored as per-session JSONL files plus an aggregated history file.
            codex_logs: vec![
                "~/.codex/sessions".to_string(),
                "~/.codex/archived_sessions".to_string(),
                "~/.codex/history.jsonl".to_string(),
                "~/.codex/logs".to_string(), // legacy fallback
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexConfig {
    #[serde(default)]
    pub receiver_enabled: bool,
    #[serde(default)]
    pub mode: String, // "otlp" | "logs" | "both"
    #[serde(default)]
    pub endpoint: String,
    #[serde(default)]
    pub header_env_key: String,
}

impl Default for CodexConfig {
    fn default() -> Self {
        Self {
            receiver_enabled: false,
            mode: "both".to_string(),
            endpoint: "http://127.0.0.1:4318/v1/logs".to_string(),
            header_env_key: "NARRATIVE_OTEL_API_KEY".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConsentState {
    #[serde(default)]
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
            watch_paths: WatchPaths::default(),
            codex: CodexConfig::default(),
            retention_days: 30,
            redaction_mode: "redact".to_string(),
            consent: ConsentState::default(),
        }
    }
}

pub fn load_config() -> Result<IngestConfig, String> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(IngestConfig::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut parsed = serde_json::from_str::<IngestConfig>(&raw).map_err(|e| e.to_string())?;

    // Best-effort migration / normalization:
    // - Add newly supported Codex sources if present (sessions + archived_sessions + history.jsonl).
    // - Remove legacy noisy Codex internal logs dir (~/.codex/log).
    normalize_codex_watch_paths(&mut parsed.watch_paths);

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

    normalize_codex_watch_paths(&mut config.watch_paths);

    save_config(&config)?;
    Ok(config)
}

fn normalize_codex_watch_paths(paths: &mut WatchPaths) {
    // De-dupe and upgrade Codex watch paths.
    let mut out: Vec<String> = Vec::new();
    for p in paths.codex_logs.iter() {
        let mut p = p.trim().to_string();
        if p.is_empty() {
            continue;
        }
        // Normalize legacy variants.
        if p.ends_with("/.codex/log") || p.ends_with("~/.codex/log") {
            continue; // never watch internal logs dir
        }
        if p.contains(".codex/archived-sessions") {
            p = p.replace(".codex/archived-sessions", ".codex/archived_sessions");
        }
        if !out.contains(&p) {
            out.push(p);
        }
    }

    // Add recommended sources when they exist and are missing.
    if let Some(home) = dirs::home_dir() {
        let recommended = [
            ("~/.codex/sessions", home.join(".codex/sessions").exists()),
            ("~/.codex/archived_sessions", home.join(".codex/archived_sessions").exists()),
            ("~/.codex/history.jsonl", home.join(".codex/history.jsonl").exists()),
        ];
        for (p, exists) in recommended {
            if !exists {
                continue;
            }
            if !out.iter().any(|v| v == p) {
                out.push(p.to_string());
            }
        }
    }

    // Ensure legacy fallback is last (if present).
    out.sort_by(|a, b| {
        let a_legacy = a.contains(".codex/logs");
        let b_legacy = b.contains(".codex/logs");
        a_legacy.cmp(&b_legacy)
    });

    paths.codex_logs = out;
}

pub fn config_path() -> Result<PathBuf, String> {
    // Cross-platform equivalent of Tauri's app_data_dir resolution:
    // dirs::data_dir() / <bundle_identifier> / ingest-config.json
    let base = dirs::data_dir().ok_or_else(|| "Could not determine data directory".to_string())?;
    Ok(base
        .join("com.jamie.narrative-mvp")
        .join("ingest-config.json"))
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
    // Back-compat for older UI: treat "present" as "key exists" (keychain or env).
    let present = secret_store::get_otlp_api_key()?.is_some()
        || std::env::var("NARRATIVE_OTEL_API_KEY")
            .ok()
            .map(|v| !v.is_empty())
            .unwrap_or(false);
    Ok(OtlpEnvStatus {
        present,
        key_name: "NARRATIVE_OTEL_API_KEY".to_string(),
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

    // Ensure a local receiver key exists (stored in keychain).
    let api_key = secret_store::ensure_otlp_api_key()?;

    // Narrative receiver expects this header.
    let header_name = "x-narrative-api-key";
    let otel_block = format!(
        "[otel]\nexporter = {{ otlp-http = {{ endpoint = \"{}\", protocol = \"json\", headers = {{ \"{}\" = \"{}\" }} }} }}\nlog_user_prompt = false\n",
        endpoint, header_name, api_key
    );

    let updated = upsert_otel_block(&existing, &otel_block);
    fs::write(&config_path, updated).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OtlpKeyStatus {
    pub present: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub masked_preview: Option<String>,
}

#[command(rename_all = "camelCase")]
pub fn get_otlp_key_status() -> Result<OtlpKeyStatus, String> {
    let key = secret_store::get_otlp_api_key()?;
    Ok(OtlpKeyStatus {
        present: key.is_some(),
        masked_preview: key.as_deref().map(secret_store::masked_preview),
    })
}

#[command(rename_all = "camelCase")]
pub fn ensure_otlp_api_key() -> Result<OtlpKeyStatus, String> {
    let key = secret_store::ensure_otlp_api_key()?;
    Ok(OtlpKeyStatus {
        present: true,
        masked_preview: Some(secret_store::masked_preview(&key)),
    })
}

#[command(rename_all = "camelCase")]
pub fn reset_otlp_api_key() -> Result<OtlpKeyStatus, String> {
    secret_store::delete_otlp_api_key()?;
    let key = secret_store::ensure_otlp_api_key()?;
    Ok(OtlpKeyStatus {
        present: true,
        masked_preview: Some(secret_store::masked_preview(&key)),
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredSources {
    pub claude: Vec<String>,
    pub cursor: Vec<String>,
    pub codex_logs: Vec<String>,
}

#[command(rename_all = "camelCase")]
pub fn discover_capture_sources() -> Result<DiscoveredSources, String> {
    let mut claude = Vec::new();
    let mut cursor = Vec::new();
    let mut codex_logs = Vec::new();

    if let Some(home) = dirs::home_dir() {
        let claude_dir = home.join(".claude/projects");
        if claude_dir.exists() {
            claude.push(claude_dir.to_string_lossy().to_string());
        }

        let cursor_composer_dir = home.join(".cursor/composer");
        if cursor_composer_dir.exists() {
            cursor.push(cursor_composer_dir.to_string_lossy().to_string());
        } else {
            let cursor_dir = home.join(".cursor");
            if cursor_dir.exists() {
                cursor.push(cursor_dir.to_string_lossy().to_string());
            }
        }

        // Codex (preferred): per-session JSONL folders
        let codex_sessions = home.join(".codex/sessions");
        if codex_sessions.exists() {
            codex_logs.push(codex_sessions.to_string_lossy().to_string());
        }
        let codex_archived = home.join(".codex/archived_sessions");
        if codex_archived.exists() {
            codex_logs.push(codex_archived.to_string_lossy().to_string());
        }
        // Codex (index/pointer): aggregated history file
        let codex_history = home.join(".codex/history.jsonl");
        if codex_history.exists() {
            codex_logs.push(codex_history.to_string_lossy().to_string());
        }
        // Codex (legacy fallback): logs
        let codex_logs_dir = home.join(".codex/logs");
        if codex_logs_dir.exists() {
            codex_logs.push(codex_logs_dir.to_string_lossy().to_string());
        }
    }

    Ok(DiscoveredSources {
        claude,
        cursor,
        codex_logs,
    })
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
