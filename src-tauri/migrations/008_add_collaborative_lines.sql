-- Migration 008: Add collaborative_lines to commit_contribution_stats

PRAGMA foreign_keys = ON;

ALTER TABLE commit_contribution_stats
ADD COLUMN collaborative_lines INTEGER DEFAULT 0;
