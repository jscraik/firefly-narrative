import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Bot, RefreshCw, Save, User, Users, HelpCircle } from 'lucide-react';
import {
  exportAttributionNote,
  formatToolName,
  getCommitContributionStats,
  importAttributionNote,
  type ContributionStats
} from '../../core/attribution-api';

interface SourceLine {
  lineNumber: number;
  content: string;
  authorType: 'human' | 'ai_agent' | 'ai_tab' | 'mixed' | 'unknown';
  sessionId?: string;
  aiPercentage?: number;
  tool?: string;
  model?: string;
  traceAvailable?: boolean;
}

interface SourceLensViewProps {
  repoId: number;
  commitSha: string;
  filePath: string;
}

function getBadgeLabel(line: SourceLine) {
  if (line.authorType === 'ai_agent') {
    return line.tool ? formatToolName(line.tool) : 'Agent';
  }
  if (line.authorType === 'ai_tab') {
    return line.tool ? `${formatToolName(line.tool)} Assist` : 'Assist';
  }
  if (line.authorType === 'mixed') {
    return `Mixed ${line.aiPercentage ?? 50}%`;
  }
  if (line.authorType === 'human') {
    return 'Human';
  }
  return 'Unknown';
}

function getBadgeTitle(line: SourceLine) {
  const parts: string[] = [];
  if (line.tool) parts.push(`Tool: ${formatToolName(line.tool)}`);
  if (line.model) parts.push(`Model: ${line.model}`);
  if (line.sessionId) parts.push(`Session: ${line.sessionId}`);
  if (line.traceAvailable === false) parts.push('Trace: local-only (not available)');
  return parts.join(' · ');
}

function formatBadgeTitle(detail: string, meta: string) {
  if (!meta) return detail;
  return `${detail} · ${meta}`;
}

function AuthorBadge({ line }: { line: SourceLine }) {
  const label = getBadgeLabel(line);
  const title = getBadgeTitle(line);

  switch (line.authorType) {
    case 'ai_agent':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700"
          title={formatBadgeTitle('AI-generated', title)}
        >
          <Bot className="w-3 h-3" />
          {label}
        </span>
      );
    case 'ai_tab':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700"
          title={formatBadgeTitle('Assist suggestions', title)}
        >
          <Bot className="w-3 h-3" />
          {label}
        </span>
      );
    case 'mixed':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700"
          title={formatBadgeTitle('Modified lines (AI + human edits)', title)}
        >
          <Users className="w-3 h-3" />
          {label}
        </span>
      );
    case 'human':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600"
          title={formatBadgeTitle('Human-authored', title)}
        >
          <User className="w-3 h-3" />
          {label}
        </span>
      );
    default:
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-400"
          title={formatBadgeTitle('Unknown source', title)}
        >
          <HelpCircle className="w-3 h-3" />
          {label}
        </span>
      );
  }
}

function getLineColor(authorType: string): string {
  switch (authorType) {
    case 'ai_agent':
      return 'bg-emerald-50/30 hover:bg-emerald-50/50';
    case 'ai_tab':
      return 'bg-blue-50/30 hover:bg-blue-50/50';
    case 'mixed':
      return 'bg-amber-50/30 hover:bg-amber-50/50';
    case 'human':
      return '';
    default:
      return '';
  }
}

export function SourceLensView({ repoId, commitSha, filePath }: SourceLensViewProps) {
  const [lines, setLines] = useState<SourceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const LIMIT = 100;

  const loadAttribution = useCallback(
    async (requestedOffset: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await invoke<{
          lines: SourceLine[];
          totalLines: number;
          hasMore: boolean;
        }>('get_file_source_lens', {
          request: {
            repoId,
            commitSha,
            filePath,
            offset: requestedOffset,
            limit: LIMIT,
          },
        });

        setLines(result.lines);
        setHasMore(result.hasMore);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [commitSha, filePath, repoId]
  );

  const loadStats = useCallback(async () => {
    setStatsError(null);
    try {
      const result = await getCommitContributionStats(repoId, commitSha);
      setStats(result);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : String(e));
    }
  }, [commitSha, repoId]);

  useEffect(() => {
    setOffset(0);
    loadAttribution(0);
    loadStats();
  }, [loadAttribution, loadStats]);

  const loadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    loadAttribution(nextOffset);
  };

  const refreshAttribution = () => {
    setOffset(0);
    loadAttribution(0);
    loadStats();
  };

  const handleImportNote = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const summary = await importAttributionNote(repoId, commitSha);
      setSyncStatus(`Imported ${summary.importedRanges} ranges from attribution note.`);
      refreshAttribution();
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const handleExportNote = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      await exportAttributionNote(repoId, commitSha);
      setSyncStatus('Exported attribution note to git notes.');
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  if (loading && lines.length === 0) {
    return (
      <div className="card p-5">
        <div className="section-header">SOURCE LENS</div>
        <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
          <div className="w-4 h-4 border-2 border-stone-300 border-t-sky-500 rounded-full animate-spin" />
          Loading source lens...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <div className="section-header">SOURCE LENS</div>
        <div className="mt-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="card p-5">
        <div className="section-header">SOURCE LENS</div>
        <div className="mt-4 flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <HelpCircle className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-sm text-stone-500 mb-1">No attribution data</p>
          <p className="text-xs text-stone-400">
            Import a session or attribution note to see line sources
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const agentLines = lines.filter(l => l.authorType === 'ai_agent' || l.authorType === 'ai_tab').length;
  const mixedLines = lines.filter(l => l.authorType === 'mixed').length;
  const humanLines = lines.filter(l => l.authorType === 'human').length;
  const agentPercentage = lines.length > 0 ? Math.round(((agentLines + mixedLines * 0.5) / lines.length) * 100) : 0;
  const hasLocalOnly = lines.some(
    (line) => line.authorType !== 'human' && line.traceAvailable === false
  );

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-header">SOURCE LENS</div>
            <div className="section-subheader mt-0.5">line attribution</div>
            {hasLocalOnly ? (
              <div className="mt-2 text-[11px] text-stone-400">
                Session traces are local-only. Import local sessions to view trace details.
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-500">{agentLines} Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-stone-500">{mixedLines} Mixed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-stone-300" />
              <span className="text-xs text-stone-500">{humanLines} Human</span>
            </div>
            {mixedLines > 0 ? (
              <div className="text-[11px] text-stone-400 inline-flex items-center gap-1">
                <span>Mixed indicates modified lines (AI + human edits).</span>
                <HelpCircle className="h-3 w-3 text-stone-300" title="Legend: added lines are AI, mixed lines are edits." />
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportNote}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                Import note
              </button>
              <button
                type="button"
                onClick={handleExportNote}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                Export note
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats bar */}
        <div className="mt-4 flex h-2 rounded-full overflow-hidden">
          {agentLines > 0 && (
            <div 
              className="bg-emerald-500" 
              style={{ width: `${(agentLines / lines.length) * 100}%` }} 
            />
          )}
          {mixedLines > 0 && (
            <div 
              className="bg-amber-500" 
              style={{ width: `${(mixedLines / lines.length) * 100}%` }} 
            />
          )}
          {humanLines > 0 && (
            <div 
              className="bg-stone-300" 
              style={{ width: `${(humanLines / lines.length) * 100}%` }} 
            />
          )}
        </div>
        <div className="mt-1 text-xs text-stone-500 text-right">
          {agentPercentage}% agent-generated
        </div>
        {stats?.toolBreakdown && stats.toolBreakdown.length > 0 ? (
          <div className="mt-2 text-[11px] text-stone-500 text-right">
            Tools:{' '}
            {stats.toolBreakdown.slice(0, 2).map((toolStat, index) => (
              <span key={`${toolStat.tool}-${toolStat.model ?? 'unknown'}`}>
                {index > 0 ? ' · ' : ''}
                {formatToolName(toolStat.tool)} {toolStat.lineCount}
              </span>
            ))}
          </div>
        ) : null}
        {syncStatus ? (
          <div className="mt-2 text-[11px] text-stone-400 text-right">{syncStatus}</div>
        ) : null}
        {statsError ? (
          <div className="mt-2 text-[11px] text-amber-600 text-right">{statsError}</div>
        ) : null}
      </div>

      {/* Line attribution table */}
      <div className="max-h-[400px] overflow-auto font-mono text-xs">
        {lines.map((line) => (
          <div
            key={line.lineNumber}
            className={`flex items-start gap-3 px-4 py-1.5 border-b border-stone-50 last:border-0 transition-colors ${getLineColor(line.authorType)}`}
          >
            <span className="w-10 text-right text-stone-400 select-none shrink-0">
              {line.lineNumber}
            </span>
            <div className="w-24 shrink-0 pt-0.5">
              <AuthorBadge line={line} />
            </div>
            <span className="flex-1 text-stone-700 whitespace-pre">
              {line.content || ' '}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="p-3 border-t border-stone-100 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            Load more...
          </button>
        </div>
      )}
    </div>
  );
}
