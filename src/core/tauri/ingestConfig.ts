import { invoke } from '@tauri-apps/api/core';

export type IngestConfig = {
  autoIngestEnabled: boolean;
  watchPaths: { claude: string[]; cursor: string[] };
  codex: { receiverEnabled: boolean; endpoint: string; headerEnvKey: string };
  retentionDays: number;
  redactionMode: 'redact';
  consent: { codexTelemetryGranted: boolean; grantedAtISO?: string };
};

export type IngestConfigUpdate = Partial<IngestConfig>;

export type OtlpEnvStatus = {
  present: boolean;
  keyName: string;
};

export type AutoImportResult = {
  status: 'imported' | 'skipped' | 'failed';
  tool: string;
  sessionId: string;
  redactionCount: number;
  needsReview: boolean;
};

export async function getIngestConfig(): Promise<IngestConfig> {
  return await invoke<IngestConfig>('get_ingest_config');
}

export async function setIngestConfig(update: IngestConfigUpdate): Promise<IngestConfig> {
  return await invoke<IngestConfig>('set_ingest_config', { update });
}

export async function getOtlpEnvStatus(): Promise<OtlpEnvStatus> {
  return await invoke<OtlpEnvStatus>('get_otlp_env_status');
}

export async function configureCodexOtel(endpoint: string): Promise<void> {
  await invoke('configure_codex_otel', { endpoint });
}

export async function startFileWatcher(paths: string[]): Promise<void> {
  await invoke('start_file_watcher', { watchPaths: paths });
}

export async function stopFileWatcher(): Promise<void> {
  await invoke('stop_file_watcher');
}

export async function autoImportSessionFile(repoId: number, filePath: string): Promise<AutoImportResult> {
  return await invoke<AutoImportResult>('auto_import_session_file', { repoId, filePath });
}

export async function purgeExpiredSessions(repoId: number, retentionDays: number): Promise<number> {
  return await invoke<number>('purge_expired_sessions', { repoId, retentionDays });
}
