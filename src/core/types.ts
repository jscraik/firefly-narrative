export type BranchStatus = 'open' | 'merged';

export type Stats = {
  added: number;
  removed: number;
  files: number;
  commits: number;
  prompts: number;
  responses: number;
};

export type IntentItem = {
  id: string;
  text: string;
  tag?: string;
};

export type FileChange = {
  path: string;
  additions: number;
  deletions: number;
};

export type SessionTool = 'claude-code' | 'codex' | 'unknown';

export type SessionMessageRole = 'user' | 'assistant';

export type SessionMessage = {
  id: string;
  role: SessionMessageRole;
  text: string;
  files?: string[];
};

export type SessionExcerpt = {
  id: string;
  tool: SessionTool;
  durationMin?: number;
  messages: SessionMessage[];
};

export type TimelineStatus = 'ok' | 'warn' | 'error';

export type TimelineBadge = {
  type: 'file' | 'test';
  label: string;
  status?: 'passed' | 'failed' | 'mixed';
};

export type TimelineNode = {
  id: string;
  atISO?: string;
  label?: string;
  status?: TimelineStatus;
  type: 'milestone' | 'commit';
  badges?: TimelineBadge[];
  testRunId?: string;
};

export type BranchViewModel = {
  source: 'demo' | 'git';
  title: string;
  status: BranchStatus;
  description: string;
  stats: Stats;
  intent: IntentItem[];
  timeline: TimelineNode[];
  // Optional, mainly for demo mode
  sessionExcerpts?: SessionExcerpt[];
  filesChanged?: FileChange[];
  diffsByFile?: Record<string, string>;
  meta?: {
    repoPath?: string;
    branchName?: string;
    headSha?: string;
  };
};

export type CommitSummary = {
  sha: string;
  subject: string;
  author: string;
  authoredAtISO: string;
};

export type CommitDetails = {
  sha: string;
  fileChanges: FileChange[];
};

export type TestStatus = 'passed' | 'failed' | 'skipped';

export type TestCase = {
  id: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
  filePath?: string;
};

export type TestRun = {
  id: string;
  sessionId?: string;
  commitSha?: string;
  atISO: string;
  durationSec: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: TestCase[];
};

// EnhancedTimelineNode is now just TimelineNode (badges and testRunId added above)
export type EnhancedTimelineNode = TimelineNode;
