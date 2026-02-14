import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ingestTraceRecord,
  scanAgentTraceRecords,
  parseTraceRecord,
  normalizeContributorType
} from '../agentTrace';
import { getDb } from '../db';

vi.mock('../db', () => ({
  getDb: vi.fn()
}));

vi.mock('../tauri/narrativeFs', () => ({
  listNarrativeFiles: vi.fn(),
  readNarrativeFile: vi.fn(),
  readTextFile: vi.fn(),
  writeNarrativeFile: vi.fn()
}));

const mockDb = {
  execute: vi.fn(),
  select: vi.fn()
};

describe('agentTrace integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    mockDb.execute.mockResolvedValue(undefined);
    mockDb.select.mockResolvedValue([]);
  });

  describe('normalizeContributorType', () => {
    it('should normalize valid contributor types', () => {
      expect(normalizeContributorType('human')).toBe('human');
      expect(normalizeContributorType('ai')).toBe('ai');
      expect(normalizeContributorType('mixed')).toBe('mixed');
      expect(normalizeContributorType('unknown')).toBe('unknown');
    });

    it('should return unknown for invalid types', () => {
      expect(normalizeContributorType('invalid')).toBe('unknown');
      expect(normalizeContributorType('')).toBe('unknown');
      expect(normalizeContributorType(undefined)).toBe('unknown');
    });
  });

  describe('parseTraceRecord', () => {
    it('should parse valid trace record', () => {
      const record = {
        id: 'trace-1',
        version: '1.0',
        timestamp: '2024-01-01T00:00:00Z',
        vcs: { type: 'git', revision: 'abc123' },
        tool: { name: 'claude-code', version: '1.0' },
        files: [{
          path: 'src/index.ts',
          conversations: [{
            contributor: { type: 'ai', modelId: 'claude-4' },
            ranges: [{ start_line: 1, end_line: 10 }]
          }]
        }]
      };

      const result = parseTraceRecord(JSON.stringify(record));
      expect(result).not.toBeNull();
      expect(result?.id).toBe('trace-1');
      expect(result?.files).toHaveLength(1);
    });

    it('should return null for invalid JSON', () => {
      expect(parseTraceRecord('invalid json')).toBeNull();
    });

    it('should return null for missing required fields', () => {
      expect(parseTraceRecord('{}')).toBeNull();
      expect(parseTraceRecord('{"id": "test"}')).toBeNull();
    });
  });

  describe('ingestTraceRecord', () => {
    it('should insert trace record into database', async () => {
      mockDb.select.mockResolvedValueOnce([{ id: 1 }]);

      const record = {
        id: 'trace-1',
        version: '1.0',
        timestamp: '2024-01-01T00:00:00Z',
        vcs: { type: 'git', revision: 'abc123' },
        tool: { name: 'claude-code', version: '1.0' },
        files: [{
          path: 'src/index.ts',
          conversations: [{
            contributor: { type: 'ai', modelId: 'claude-4' },
            ranges: [{ startLine: 1, endLine: 10 }]
          }]
        }]
      };

      await ingestTraceRecord(1, record as any);

      expect(mockDb.execute).toHaveBeenCalled();
      const calls = mockDb.execute.mock.calls;
      expect(calls.some(call => 
        call[0].includes('INSERT OR IGNORE INTO trace_records')
      )).toBe(true);
    });

    it('should skip duplicate records', async () => {
      mockDb.select.mockResolvedValueOnce([{ id: 'existing' }]);

      const record = {
        id: 'trace-1',
        version: '1.0',
        timestamp: '2024-01-01T00:00:00Z',
        vcs: { type: 'git', revision: 'abc123' },
        files: []
      };

      await ingestTraceRecord(1, record as any);

      // Should not insert if record exists
      const traceCalls = mockDb.execute.mock.calls.filter(
        call => call[0].includes('trace_records')
      );
      expect(traceCalls.length).toBe(0);
    });
  });

  describe('scanAgentTraceRecords', () => {
    it('should aggregate trace data by commit', async () => {
      mockDb.select.mockResolvedValueOnce([
        {
          revision: 'abc123',
          path: 'src/index.ts',
          contributor_type: 'ai',
          start_line: 1,
          end_line: 10
        },
        {
          revision: 'abc123',
          path: 'src/index.ts',
          contributor_type: 'human',
          start_line: 11,
          end_line: 20
        }
      ]);

      const result = await scanAgentTraceRecords('/test/repo', 1, ['abc123']);

      expect(result.byCommit['abc123']).toBeDefined();
      expect(result.byCommit['abc123'].aiLines).toBe(10);
      expect(result.byCommit['abc123'].humanLines).toBe(10);
      expect(result.totals.conversations).toBeGreaterThan(0);
    });

    it('should handle empty results', async () => {
      mockDb.select.mockResolvedValueOnce([]);

      const result = await scanAgentTraceRecords('/test/repo', 1, ['abc123']);

      expect(result.byCommit['abc123']).toBeUndefined();
      expect(result.totals.conversations).toBe(0);
    });
  });
});
