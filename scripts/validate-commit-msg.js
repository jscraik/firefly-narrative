#!/usr/bin/env node
/**
 * Commit message validation hook
 *
 * Validates commit messages follow governance requirements:
 * - Conventional commit format (feat|fix|chore|docs|refactor|test|style)
 * - Co-authorship for AI-generated code
 * - PR template completion reminder for agent branches
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const COMMIT_MSG_FILE = process.argv[2];
const CONVENTIONAL_COMMIT_REGEX =
	/^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?!?:\s.+/;
const CO_AUTHOR_REGEX = /Co-authored-by:\s*.+/i;
const CODEX_TRAILER_LINE = "Co-authored-by: Codex <noreply@openai.com>";
const CODEX_TRAILER_REGEX = /^Co-authored-by:\s*Codex <noreply@openai\.com>\s*$/gim;

function main() {
	if (!COMMIT_MSG_FILE) {
		console.error("Usage: validate-commit-msg.js <commit-msg-file>");
		process.exit(1);
	}

	let commitMsg;
	try {
		commitMsg = readFileSync(COMMIT_MSG_FILE, "utf-8");
	} catch (e) {
		console.error(`Failed to read commit message file: ${e.message}`);
		process.exit(1);
	}

	const errors = [];
	const lines = commitMsg.split("\n").filter((line) => !line.startsWith("#"));
	const subjectIndex = lines.findIndex((line) => line.trim() !== "");
	const firstNonEmptyLine = subjectIndex >= 0 ? lines[subjectIndex].trim() : "";

	// Check 1: Conventional commit format
	const firstLine = firstNonEmptyLine;
	if (!CONVENTIONAL_COMMIT_REGEX.test(firstLine)) {
		errors.push(
			"First line must follow conventional commit format: type(scope)!: description",
		);
	}

	// Check 2: First line length
	if (firstLine && firstLine.length > 72) {
		errors.push(`First line exceeds 72 characters (${firstLine.length} chars)`);
	}

	// Check 3: Body paragraphs separated by blank line
	const bodyStartIndex = subjectIndex >= 0 ? subjectIndex + 1 : -1;
	if (
		bodyStartIndex >= 0 &&
		lines.length > bodyStartIndex &&
		lines[bodyStartIndex].trim() !== ""
	) {
		errors.push(
			"Body must be separated from subject by a blank line for readability",
		);
	}

	// Check 4: Co-authorship for AI-assisted commits (enforced)
	const hasCoAuthor = CO_AUTHOR_REGEX.test(commitMsg);
	const branchName = getBranchName();
	const isAgentBranch = /codex|claude|agent/i.test(branchName);
	const codexTrailerMatches = commitMsg.match(CODEX_TRAILER_REGEX) ?? [];

	if (isAgentBranch && !hasCoAuthor) {
		errors.push(
			`AI-assisted branch detected. Add trailer: "${CODEX_TRAILER_LINE}".`,
		);
	}

	if (isAgentBranch && hasCoAuthor && codexTrailerMatches.length === 0) {
		errors.push(
			`Codex branch detected. Expected trailer: "${CODEX_TRAILER_LINE}".`,
		);
	}
	if (codexTrailerMatches.length > 1) {
		errors.push(
			`Duplicate "${CODEX_TRAILER_LINE}" trailer found. Keep exactly one trailer line.`,
		);
	}

	// Check 5: PR template reminder for agent branches
	// Note: PR template sections are enforced by PR review workflow, not commit hook
	// Agent branches should follow: Summary, Checklist, Testing, Review artifacts, Notes

	// Output results
	if (errors.length > 0) {
		console.error("\n❌ Commit message validation failed:\n");
		for (const error of errors) {
			console.error(`  ✗ ${error}`);
		}
		console.error(
			`\nCommit message format example:\n  feat(scope): add new feature\n\n  Detailed description here.\n\n  ${CODEX_TRAILER_LINE}`,
		);
		process.exit(1);
	}

	process.exit(0);
}

function getBranchName() {
	try {
		// Using execFileSync for safety - no shell interpolation
		const output = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return output.trim();
	} catch {
		return "";
	}
}

main();
