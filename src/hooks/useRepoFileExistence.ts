import { useEffect, useMemo, useState } from 'react';
import { fileExists } from '../core/tauri/narrativeFs';

/**
 * Best-effort existence checks for repo-relative paths.
 *
 * Notes:
 * - Used only for UI hints; failures degrade to "unknown".
 * - Caches results per component instance.
 */
export function useRepoFileExistence(repoRoot: string, paths: string[]) {
  const unique = useMemo(() => Array.from(new Set(paths)).slice(0, 50), [paths]);
  const [existsMap, setExistsMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!repoRoot) return;

      for (const p of unique) {
        if (p in existsMap) continue;
        try {
          const ok = await fileExists(repoRoot, p);
          if (cancelled) return;
          setExistsMap((prev) => (p in prev ? prev : { ...prev, [p]: ok }));
        } catch {
          // Unknown -> don't set; UI will treat as "best-effort/unknown"
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [repoRoot, unique, existsMap]);

  return existsMap;
}
