import { invoke } from '@tauri-apps/api/core';

export async function ensureNarrativeDirs(repoRoot: string): Promise<void> {
  await invoke('ensure_narrative_dirs', { repoRoot });
}

export async function writeNarrativeFile(repoRoot: string, relativePath: string, contents: string): Promise<void> {
  await invoke('write_narrative_file', {
    repoRoot,
    relativePath,
    contents
  });
}

export async function readNarrativeFile(repoRoot: string, relativePath: string): Promise<string> {
  return await invoke<string>('read_narrative_file', {
    repoRoot,
    relativePath
  });
}

export async function listNarrativeFiles(repoRoot: string, relativeDir: string): Promise<string[]> {
  return await invoke<string[]>('list_narrative_files', {
    repoRoot,
    relativeDir
  });
}

/**
 * Reads a file from an arbitrary absolute path.
 * Intended for manual imports (user picks file via dialog).
 */
export async function readTextFile(absPath: string): Promise<string> {
  return await invoke<string>('read_text_file', { path: absPath });
}
