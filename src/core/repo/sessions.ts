import type { SessionExcerpt, SessionMessage } from '../types';
import { listNarrativeFiles, readNarrativeFile } from '../tauri/narrativeFs';

type SessionPayload = {
  tool?: string;
  durationMin?: number;
  messages?: Array<{ role: 'user' | 'assistant'; text: string; files?: string[] }>;
};

function normalizeExcerpt(id: string, raw: SessionPayload): SessionExcerpt {
  const tool = (raw.tool as SessionExcerpt['tool']) ?? 'unknown';
  const durationMin = typeof raw.durationMin === 'number' ? raw.durationMin : undefined;

  const messages: SessionMessage[] = (raw.messages ?? []).map((m, idx) => ({
    id: `${id}:m${idx}`,
    role: m.role,
    text: m.text,
    files: m.files
  }));

  return {
    id,
    tool,
    durationMin,
    messages
  };
}

export async function loadSessionExcerpts(repoRoot: string, limit = 1): Promise<SessionExcerpt[]> {
  try {
    const all = await listNarrativeFiles(repoRoot, 'sessions');
    const jsonFiles = all.filter((p) => p.toLowerCase().endsWith('.json'));

    // newest first (we write files with ISO prefix)
    jsonFiles.sort((a, b) => b.localeCompare(a));

    const excerpts: SessionExcerpt[] = [];

    for (const rel of jsonFiles.slice(0, limit)) {
      const txt = await readNarrativeFile(repoRoot, rel);
      const parsed = JSON.parse(txt) as any;

      // Accept either a direct SessionPayload or a wrapper with { payload }
      const payload: SessionPayload = parsed?.payload ?? parsed;

      if (!payload || !Array.isArray(payload.messages)) continue;
      excerpts.push(normalizeExcerpt(rel, payload));
    }

    return excerpts;
  } catch {
    return [];
  }
}
