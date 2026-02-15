import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Sparkles, User, Terminal, Lightbulb, Wrench, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { SessionExcerpt, SessionMessage, SessionMessageRole } from '../../core/types';

const ROLE_CONFIG: Record<SessionMessageRole, {
  label: string;
  icon: typeof User;
  colorClass: string;
}> = {
  user: {
    label: 'You',
    icon: User,
    colorClass: 'text-accent-blue'
  },
  assistant: {
    label: 'Assistant',
    icon: Bot,
    colorClass: 'text-text-secondary'
  },
  thinking: {
    label: 'Thinking',
    icon: Lightbulb,
    colorClass: 'text-accent-amber'
  },
  plan: {
    label: 'Plan',
    icon: Sparkles,
    colorClass: 'text-accent-violet'
  },
  tool_call: {
    label: 'Tool',
    icon: Wrench,
    colorClass: 'text-accent-green'
  }
};

function messageTitle(message: SessionMessage): string {
  if (message.role === 'tool_call' && message.toolName) {
    return message.toolName;
  }
  if (message.role === 'thinking') {
    return 'Internal reasoning';
  }
  if (message.role === 'plan') {
    return 'Execution plan';
  }
  return ROLE_CONFIG[message.role].label;
}

function roleBadge(role: SessionMessageRole) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${config.colorClass}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function roleSummary(messages: SessionMessage[]) {
  return messages.reduce<Record<SessionMessageRole, number>>((acc, message) => {
    acc[message.role] = (acc[message.role] ?? 0) + 1;
    return acc;
  }, {
    user: 0,
    assistant: 0,
    thinking: 0,
    plan: 0,
    tool_call: 0
  });
}

function formatToolInput(message: SessionMessage): string {
  if (message.toolInput !== undefined) {
    if (typeof message.toolInput === 'string') {
      return message.toolInput;
    }
    try {
      return JSON.stringify(message.toolInput, null, 2);
    } catch {
      return String(message.toolInput);
    }
  }
  return message.text ?? '';
}

function ToolCallDetails({ message }: { message: SessionMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const toolInput = formatToolInput(message);
  const hasInput = toolInput && toolInput.length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toolInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore copy errors
    }
  };

  return (
    <div className="mt-2 rounded border border-border-light bg-bg-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          Tool Input
        </span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      
      {isExpanded && (
        <div className="border-t border-border-light">
          <div className="flex items-center justify-between px-3 py-1.5 bg-bg-page border-b border-border-light">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">
              Arguments
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {copied ? (
                <><Check className="w-3 h-3" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
          <div className="p-3">
            {hasInput ? (
              <pre className="text-[11px] text-text-secondary whitespace-pre-wrap break-words font-mono leading-relaxed">
                {toolInput}
              </pre>
            ) : (
              <span className="text-[11px] text-text-muted italic">No input recorded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ message }: { message: SessionMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const text = message.text ?? '';
  const isLong = text.length > 200;
  const displayText = isExpanded || !isLong ? text : `${text.slice(0, 200)}...`;

  return (
    <div className="mt-2">
      <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
        {displayText}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-accent-amber hover:text-text-primary font-medium flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show full reasoning</>
          )}
        </button>
      )}
    </div>
  );
}

function MessageCard({
  message,
  selectedFile,
  onFileClick
}: {
  message: SessionMessage;
  selectedFile?: string | null;
  onFileClick?: (path: string) => void;
}) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool_call';

  return (
    <div className="py-3 border-b border-border-light last:border-b-0">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {roleBadge(message.role)}
          {isTool && message.toolName && (
            <span className="text-[11px] text-text-muted">{message.toolName}</span>
          )}
        </div>
      </div>

      {/* Content */}
      {message.role === 'thinking' ? (
        <ThinkingBlock message={message} />
      ) : message.role === 'tool_call' ? (
        <ToolCallDetails message={message} />
      ) : (
        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? 'text-text-primary' : 'text-text-secondary'}`}>
          {message.text || (
            <span className="text-text-muted italic">No message content</span>
          )}
        </div>
      )}

      {/* File pills */}
      {message.files && message.files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.files.map((file) => (
            <button
              key={file}
              type="button"
              onClick={() => onFileClick?.(file)}
              aria-pressed={selectedFile === file}
              title={file}
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] max-w-full truncate transition-colors ${
                selectedFile === file 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-bg-page text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {file.split('/').pop()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-header">Conversation</div>
          <div className="section-subheader">Session messages and context</div>
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center text-center py-4">
        <div className="w-12 h-12 rounded-full bg-bg-page flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-text-muted" />
        </div>
        <p className="text-sm text-text-secondary mb-1">No conversation loaded</p>
        <p className="text-xs text-text-muted max-w-[280px]">
          Import a session to see the full conversation
        </p>
      </div>
    </div>
  );
}

function StatsBar({ stats }: { stats: Record<SessionMessageRole, number> }) {
  const items = [
    { count: stats.user, label: 'prompts', color: 'text-accent-blue' },
    { count: stats.assistant, label: 'responses', color: 'text-text-secondary' },
    { count: stats.tool_call, label: 'tools', color: 'text-accent-green' },
  ].filter(item => item.count > 0);

  return (
    <div className="flex items-center gap-3 text-[11px]">
      {items.map(({ count, label, color }) => (
        <span key={label} className="flex items-center gap-1 text-text-muted">
          <span className={`font-semibold ${color}`}>{count}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

export function TraceTranscriptPanel({
  excerpt,
  selectedFile,
  onFileClick
}: {
  excerpt?: SessionExcerpt;
  selectedFile?: string | null;
  onFileClick?: (path: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [pendingScrollToEnd, setPendingScrollToEnd] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = excerpt?.messages ?? [];
  const stats = useMemo(() => roleSummary(messages), [messages]);
  const visibleMessages = showAll ? messages : messages.slice(0, 6);
  const hiddenCount = messages.length - visibleMessages.length;

  useEffect(() => {
    if (!pendingScrollToEnd) return;
    const shouldReduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'end' });
    setPendingScrollToEnd(false);
  }, [pendingScrollToEnd]);

  const handleJumpToLatest = () => {
    setShowAll(true);
    setPendingScrollToEnd(true);
  };

  if (!excerpt || messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-border-light">
        <div>
          <div className="section-header">Conversation</div>
          <div className="section-subheader mt-0.5">
            {messages.length} messages
          </div>
        </div>
        <StatsBar stats={stats} />
      </div>

      {/* Messages */}
      <div>
        {visibleMessages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            selectedFile={selectedFile}
            onFileClick={onFileClick}
          />
        ))}
      </div>

      {/* Show more/less */}
      {hiddenCount > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 pt-3 border-t border-border-light">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-page text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show {hiddenCount} more</>
            )}
          </button>
          {!showAll && (
            <button
              type="button"
              onClick={handleJumpToLatest}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Jump to latest
            </button>
          )}
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
