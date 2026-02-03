import { Link2, Link2Off, Upload } from 'lucide-react';
import { useState } from 'react';
import type { SessionExcerpt } from '../../core/types';
import { Dialog } from './Dialog';

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
    <div className="flex items-center gap-2 text-[11px] text-stone-400">
      <span className="px-2 py-1 bg-stone-100 rounded-md font-mono text-stone-500">
        {tool}
      </span>
      {agentName ? <span className="text-stone-500">· {agentName}</span> : null}
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
      <div className="flex items-center gap-2 text-[11px] text-stone-500">
        <Link2Off className="w-3 h-3" />
        <span>Not linked</span>
      </div>
    );
  }

  const shortSha = excerpt.linkedCommitSha.slice(0, 8);
  const confidencePercent = excerpt.linkConfidence ? Math.round(excerpt.linkConfidence * 100) : 0;
  const isAutoLinked = excerpt.autoLinked ?? false;

  return (
    <div className="flex items-center gap-2 text-[11px] text-stone-400">
      <Link2 className="w-3 h-3" />
      <button
        type="button"
        onClick={onClick}
        aria-label={`View commit ${shortSha} in timeline`}
        className={`
          text-stone-600 hover:text-sky-600 transition-colors
          ${isSelected ? 'text-sky-600 font-semibold' : ''}
        `}
        title="Click to view this commit in the timeline"
      >
        Linked to <span className="font-mono">{shortSha}</span>
      </button>
      <span className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">
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
  isSelected
}: {
  file: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isSelected ? `View file ${file} (selected)` : `View file ${file}`}
      aria-pressed={isSelected}
      title={file}
      className={`pill-file max-w-full truncate ${isSelected ? 'selected' : ''}`}
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

export function SessionExcerpts({
  excerpts,
  selectedFile,
  onFileClick,
  onUnlink,
  onCommitClick,
  selectedCommitId,
  selectedSessionId,
  onSelectSession
}: {
  excerpts: SessionExcerpt[] | undefined;
  selectedFile?: string | null;
  onFileClick?: (path: string) => void;
  onUnlink?: (sessionId: string) => void;
  onCommitClick?: (commitSha: string) => void;
  selectedCommitId?: string | null;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
}) {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [pendingUnlinkId, setPendingUnlinkId] = useState<string | null>(null);

  if (!excerpts || excerpts.length === 0) {
    return (
      <div className="card p-5 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-header">SESSION SUMMARY</div>
            <div className="section-subheader mt-0.5">Key moments from the session</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-sm text-stone-500 mb-1">No sessions imported yet</p>
          <p className="text-xs text-stone-400 mb-4">Import from Claude, Cursor, or Kimi</p>
        </div>
      </div>
    );
  }

  const excerpt =
    excerpts.find((item) => item.id === selectedSessionId) ?? excerpts[0];

  const filesTouched = collectFiles(excerpt.messages);
  const highlights = selectHighlights(excerpt.messages);

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
            <div className="section-subheader mt-0.5">Key moments from the session</div>
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

        {excerpts.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {excerpts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSession?.(item.id)}
                className={`px-2 py-1 rounded-md text-[11px] border ${
                  item.id === excerpt.id
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {item.tool}
                {item.redactionCount ? ` · ${item.redactionCount} redactions` : ''}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 rounded-lg border border-stone-100 bg-stone-50 p-4">
          <div className="flex flex-wrap gap-4 text-xs text-stone-600">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Messages</div>
              <div className="font-semibold">{excerpt.messages.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Files</div>
              <div className="font-semibold">{filesTouched.length}</div>
            </div>
            {typeof excerpt.durationMin === 'number' ? (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Duration</div>
                <div className="font-semibold">{excerpt.durationMin} min</div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400">AI-suggested highlights</div>
            {highlights.length > 0 ? (
              <ul className="mt-2 list-disc pl-4 text-xs text-stone-600 space-y-1">
                {highlights.map((highlight) => (
                  <li key={highlight.id}>{highlight.text}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-xs text-stone-400">No highlights available.</div>
            )}
            <div className="mt-2 text-[11px] text-stone-400">
              Review these in the Conversation panel before reusing or sharing.
            </div>
          </div>

          {filesTouched.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Files touched</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {filesTouched.slice(0, 8).map((f) => (
                  <FilePill
                    key={f}
                    file={f}
                    isSelected={selectedFile === f}
                    onClick={() => onFileClick?.(f)}
                  />
                ))}
                {filesTouched.length > 8 ? (
                  <span className="text-[11px] text-stone-400">
                    +{filesTouched.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="text-[11px] text-stone-400">
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
