import { Link2, Link2Off, Upload } from 'lucide-react';
import { useState } from 'react';
import type { SessionExcerpt } from '../../core/types';
import { Dialog } from './Dialog';
import { useRepoFileExistence } from '../../hooks/useRepoFileExistence';

function truncateText(text: string, limit = 160) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trim()}…`;
}

function ToolPill({
  tool,
  durationMin,
  agentName,
  redactionCount
}: {
  tool: string;
  durationMin?: number;
  agentName?: string;
  redactionCount?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted">
      <span className="px-2 py-1 bg-bg-page rounded-md font-mono text-text-tertiary">
        {tool}
      </span>
      {agentName ? <span className="text-text-tertiary">· {agentName}</span> : null}
      {typeof durationMin === 'number' && (
        <span>{durationMin} min</span>
      )}
      {typeof redactionCount === 'number' && redactionCount > 0 ? (
        <span className="px-1.5 py-0.5 bg-amber-50 rounded text-amber-700">Redacted {redactionCount}</span>
      ) : null}
    </div>
  );
}

function collectFiles(messages: SessionExcerpt['messages']) {
  const files = messages.flatMap((m) => m.files ?? []);
  return Array.from(new Set(files));
}

function isRepoRelativePath(p: string): boolean {
  // POSIX absolute
  if (p.startsWith('/')) return false;
  // Windows drive absolute
  if (/^[A-Za-z]:[\\/]/.test(p)) return false;
  // Avoid traversal-y looking paths (best-effort)
  if (p.includes('..')) return false;
  return true;
}

function selectHighlights(messages: SessionExcerpt['messages']) {
  const assistantMessages = messages.filter((m) =>
    ['assistant', 'thinking', 'plan'].includes(m.role)
  );
  const source = assistantMessages.length > 0 ? assistantMessages : messages;
  return source
    .filter((m) => m.text.trim().length > 0)
    .slice(0, 3)
    .map((m) => ({ id: m.id, text: truncateText(m.text) }));
}

function LinkStatus({ excerpt, onUnlink, onClick, isSelected }: {
  excerpt: SessionExcerpt;
  onUnlink?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  if (!excerpt.linkedCommitSha) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
        <Link2Off className="w-3 h-3" />
        <span>Not linked</span>
      </div>
    );
  }

  const shortSha = excerpt.linkedCommitSha.slice(0, 8);
  const confidencePercent = excerpt.linkConfidence ? Math.round(excerpt.linkConfidence * 100) : 0;
  const isAutoLinked = excerpt.autoLinked ?? false;

  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted">
      <Link2 className="w-3 h-3" />
      <button
        type="button"
        onClick={onClick}
        aria-label={`View commit ${shortSha} in timeline`}
        className={`
          text-text-secondary hover:text-sky-600 transition-colors
          ${isSelected ? 'text-sky-600 font-semibold' : ''}
        `}
        title="Click to view this commit in the timeline"
      >
        Linked to <span className="font-mono">{shortSha}</span>
      </button>
      <span className="px-1.5 py-0.5 bg-bg-page rounded text-text-tertiary">
        {confidencePercent}%
      </span>
      {isAutoLinked && (
        <span className="px-1.5 py-0.5 bg-emerald-50 rounded text-emerald-600">
          Auto
        </span>
      )}
      {onUnlink && (
        <button
          type="button"
          onClick={onUnlink}
          aria-label="Unlink session from commit"
          className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded text-red-600 transition-colors"
          title="Unlink this session from the commit"
        >
          Unlink
        </button>
      )}
    </div>
  );
}

function FilePill({
  file,
  onClick,
  isSelected,
  variant,
  title
}: {
  file: string;
  onClick?: () => void;
  isSelected?: boolean;
  variant?: 'default' | 'best-effort' | 'not-found';
  title?: string;
}) {
  const variantClass =
    variant === 'not-found' ? 'not-found' : variant === 'best-effort' ? 'best-effort' : '';

  if (!onClick) {
    return (
      <span
        title={title ?? file}
        className={`pill-file max-w-full truncate ${variantClass} ${isSelected ? 'selected' : ''}`}
      >
        {file}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isSelected ? `View file ${file} (selected)` : `View file ${file}`}
      aria-pressed={isSelected}
      title={title ?? file}
      className={`pill-file max-w-full truncate ${variantClass} ${isSelected ? 'selected' : ''}`}
    >
      {file}
    </button>
  );
}

function UnlinkConfirmDialog({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      title="Unlink session from commit?"
      message="This will remove the association between the AI session and the commit. The session will remain imported but will show as 'Not linked'."
      confirmLabel="Unlink"
      cancelLabel="Cancel"
      variant="destructive"
      open={isOpen}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}

export interface SessionExcerptsProps {
  excerpts: SessionExcerpt[] | undefined;
  selectedFile?: string | null;
  onFileClick?: (path: string) => void;
  onUnlink?: (sessionId: string) => void;
  onCommitClick?: (commitSha: string) => void;
  selectedCommitId?: string | null;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  repoRoot?: string;
  changedFiles?: string[];
}

export function SessionExcerpts({
  excerpts,
  selectedFile,
  onFileClick,
  onUnlink,
  onCommitClick,
  selectedCommitId,
  selectedSessionId,
  onSelectSession,
  repoRoot,
  changedFiles
}: SessionExcerptsProps) {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [pendingUnlinkId, setPendingUnlinkId] = useState<string | null>(null);

  const hasExcerpts = Boolean(excerpts && excerpts.length > 0);
  const excerpt = hasExcerpts
    ? excerpts?.find((item) => item.id === selectedSessionId) ?? excerpts?.[0] ?? null
    : null;

  const filesTouched = excerpt ? collectFiles(excerpt.messages) : [];
  const highlights = excerpt ? selectHighlights(excerpt.messages) : [];
  const changedSet = new Set(changedFiles ?? []);
  const visibleFiles = filesTouched.slice(0, 8);
  const existsMap = useRepoFileExistence(
    repoRoot ?? '',
    visibleFiles.filter((p) => isRepoRelativePath(p))
  );

  if (!hasExcerpts) {
    return (
      <div className="card p-5 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-header">SESSION SUMMARY</div>
            <div className="section-subheader">Key moments from the session</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-bg-page flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-text-muted" />
          </div>
          <p className="text-sm text-text-tertiary mb-1">No sessions imported yet</p>
          <p className="text-xs text-text-muted mb-4">Import from Claude, Cursor, or Kimi</p>
        </div>
      </div>
    );
  }

  if (!excerpt) {
    // Defensive: should be impossible if hasExcerpts is true, but keeps TS happy.
    return null;
  }

  const allExcerpts = excerpts ?? [];
  const linkedCommitSha = excerpt.linkedCommitSha ?? null;

  const handleUnlinkClick = () => {
    setPendingUnlinkId(excerpt.id);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = () => {
    if (pendingUnlinkId && onUnlink) {
      onUnlink(pendingUnlinkId);
    }
    setUnlinkDialogOpen(false);
    setPendingUnlinkId(null);
  };

  const handleUnlinkCancel = () => {
    setUnlinkDialogOpen(false);
    setPendingUnlinkId(null);
  };

  return (
    <>
      <div className="card p-5 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-header">SESSION SUMMARY</div>
            <div className="section-subheader">Key moments from the session</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <ToolPill
              tool={excerpt.tool}
              durationMin={excerpt.durationMin}
              agentName={excerpt.agentName}
              redactionCount={excerpt.redactionCount}
            />
            <LinkStatus
              excerpt={excerpt}
              onUnlink={onUnlink && linkedCommitSha ? handleUnlinkClick : undefined}
              onClick={linkedCommitSha && onCommitClick ? () => onCommitClick(linkedCommitSha) : undefined}
              isSelected={selectedCommitId === linkedCommitSha}
            />
            {excerpt.needsReview ? (
              <span className="px-1.5 py-0.5 bg-amber-50 rounded text-amber-700 text-[11px]">Needs review</span>
            ) : null}
          </div>
        </div>

        {allExcerpts.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {allExcerpts.map((item) => {
              const isActive = item.id === excerpt.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSession?.(item.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150
                    ${isActive
                      ? 'bg-accent-blue-light border-accent-blue text-accent-blue shadow-sm ring-1 ring-accent-blue/20'
                      : 'bg-bg-card border-border-light text-text-secondary hover:bg-bg-hover hover:border-border-medium'
                    }
                  `}
                  aria-pressed={isActive}
                >
                  {item.tool}
                  {item.redactionCount ? ` · ${item.redactionCount} redactions` : ''}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 rounded-lg border border-border-subtle bg-bg-subtle p-4">
          <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Messages</div>
              <div className="font-semibold">{excerpt.messages.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Mentioned files</div>
              <div className="font-semibold">{filesTouched.length}</div>
            </div>
            {typeof excerpt.durationMin === 'number' ? (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Duration</div>
                <div className="font-semibold">{excerpt.durationMin} min</div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">AI-suggested highlights</div>
            {highlights.length > 0 ? (
              <ul className="mt-2 list-disc pl-4 text-xs text-text-secondary space-y-1">
                {highlights.map((highlight) => (
                  <li key={highlight.id}>{highlight.text}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-xs text-text-muted">No highlights available.</div>
            )}
            <div className="mt-2 text-[11px] text-text-muted">
              Review these in the Conversation panel before reusing or sharing.
            </div>
          </div>

          {filesTouched.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Mentioned files</div>
              <div className="mt-1 text-[11px] text-text-muted">
                From imported session logs. Best-effort — may not be changed in this commit.
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleFiles.map((f) => (
                  (() => {
                    const isRel = isRepoRelativePath(f);
                    const exists = isRel ? existsMap[f] : false;
                    const inCommit = changedSet.has(f);
                    const variant: 'default' | 'best-effort' | 'not-found' =
                      exists === false ? 'not-found' : inCommit ? 'default' : 'best-effort';
                    const title = !isRel
                      ? 'Mentioned, but the path is not repo-relative'
                      : exists === false
                        ? 'Mentioned, but file was not found in this repo'
                        : inCommit
                          ? 'Mentioned and changed in this commit'
                          : 'Mentioned, but not changed in this commit';
                    const clickable = isRel && exists !== false;

                    return (
                      <FilePill
                        key={f}
                        file={f}
                        isSelected={selectedFile === f}
                        variant={variant}
                        title={title}
                        onClick={clickable ? () => onFileClick?.(f) : undefined}
                      />
                    );
                  })()
                ))}
                {filesTouched.length > 8 ? (
                  <span className="text-[11px] text-text-muted">
                    +{filesTouched.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="text-[11px] text-text-muted">
            Full conversation appears below in the Conversation panel.
          </div>
        </div>
      </div>

      <UnlinkConfirmDialog
        isOpen={unlinkDialogOpen}
        onClose={handleUnlinkCancel}
        onConfirm={handleUnlinkConfirm}
      />
    </>
  );
}
