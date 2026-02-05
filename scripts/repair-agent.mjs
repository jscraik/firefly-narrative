#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';

const DEFAULT_VERIFY_CMD = process.env.REPAIR_VERIFY_CMD || 'pnpm test';
const DEFAULT_MAX_ITERATIONS = Number.parseInt(process.env.REPAIR_MAX_ITERATIONS || '5', 10);
const DEFAULT_POLL_INTERVAL_MS = Number.parseInt(process.env.REPAIR_POLL_INTERVAL_MS || '60000', 10);

function log(message) {
  const timestamp = new Date().toISOString();
  process.stdout.write(`[repair-agent ${timestamp}] ${message}\n`);
}

function runCommand(command, { cwd, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = escaped
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '.');
  return new RegExp(`^${regex}$`);
}

async function globFiles({ cwd, patterns }) {
  log(`Glob: ${patterns.join(', ')}`);
  const { stdout } = await runCommand('git ls-files', { cwd });
  const files = stdout.split('\n').filter(Boolean);
  const regexes = patterns.map((pattern) => globToRegex(pattern));
  return files.filter((file) => regexes.some((regex) => regex.test(file)));
}

async function readFile({ cwd, filePath, maxChars = 4000 }) {
  log(`Read: ${filePath}`);
  const absolute = path.join(cwd, filePath);
  const content = await fs.readFile(absolute, 'utf-8');
  return content.length > maxChars ? content.slice(0, maxChars) : content;
}

async function applyPatch({ cwd, patch }) {
  log('Edit: applying patch');
  const result = await runCommand('git apply --whitespace=fix -', { cwd, input: patch });
  if (result.code !== 0) {
    throw new Error(`git apply failed: ${result.stderr || result.stdout}`);
  }
}

function extractFilePaths(logText) {
  const matches = new Set();
  const regex = /([A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|json|md|css|rs))/g;
  let match;
  while ((match = regex.exec(logText)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function classifyFailure(logText) {
  if (/biome|eslint|lint/i.test(logText)) return 'lint';
  if (/tsc|type error|TS\d+/i.test(logText)) return 'type';
  if (/npm ERR|pnpm ERR|dependency|lockfile|missing/i.test(logText)) return 'dependency';
  if (/vitest|jest|FAIL|AssertionError|test failed/i.test(logText)) return 'test';
  return 'unknown';
}

async function buildContext({ cwd, logText }) {
  const inferredFiles = extractFilePaths(logText);
  const files = inferredFiles.length
    ? inferredFiles
    : await globFiles({ cwd, patterns: ['src/**/*.{ts,tsx,js,jsx}', 'src-tauri/src/**/*.rs'] });

  const uniqueFiles = Array.from(new Set(files));
  const fileContents = [];
  for (const filePath of uniqueFiles.slice(0, 12)) {
    try {
      const content = await readFile({ cwd, filePath });
      fileContents.push({ path: filePath, content });
    } catch (error) {
      log(`Read failed for ${filePath}: ${error.message}`);
    }
  }

  return { files: fileContents };
}

async function runLintAutofix({ cwd }) {
  const lintFixCommand = process.env.REPAIR_LINT_FIX_CMD || 'pnpm biome check src src-tauri/src --write';
  log(`Running lint autofix: ${lintFixCommand}`);
  const result = await runCommand(lintFixCommand, { cwd });
  if (result.code !== 0) {
    log(`Lint autofix failed: ${result.stderr || result.stdout}`);
    return false;
  }
  return true;
}

async function runLLMFix({ cwd, logText, failureType }) {
  const llmCommand = process.env.REPAIR_LLM_CMD;
  if (!llmCommand) return null;

  const context = await buildContext({ cwd, logText });
  const payload = JSON.stringify({
    failureType,
    log: logText.slice(0, 12000),
    files: context.files,
  });

  log(`LLM: invoking command ${llmCommand}`);
  const result = await runCommand(llmCommand, { cwd, input: payload });
  if (result.code !== 0) {
    throw new Error(`LLM command failed: ${result.stderr || result.stdout}`);
  }

  let response;
  try {
    response = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`LLM response was not valid JSON: ${error.message}`);
  }

  if (!response.patch) return null;
  await applyPatch({ cwd, patch: response.patch });
  return response;
}

async function attemptFix({ cwd, logText }) {
  const failureType = classifyFailure(logText);
  log(`Detected failure type: ${failureType}`);

  if (failureType === 'lint') {
    const lintFixed = await runLintAutofix({ cwd });
    if (lintFixed) return { applied: true, message: 'Applied lint autofix.' };
  }

  const llmResponse = await runLLMFix({ cwd, logText, failureType });
  if (llmResponse) {
    return { applied: true, message: llmResponse.message || 'Applied LLM patch.' };
  }

  return { applied: false, message: 'No fix applied.' };
}

async function runVerifyCommand({ cwd, verifyCmd }) {
  log(`Running verify command: ${verifyCmd}`);
  const result = await runCommand(verifyCmd, { cwd });
  return result;
}

async function runRepairLoop({ cwd, verifyCmd = DEFAULT_VERIFY_CMD, maxIterations = DEFAULT_MAX_ITERATIONS }) {
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const status = await runCommand('git status --porcelain', { cwd });
    const statusLine = status.stdout.trim() ? 'dirty' : 'clean';
    log(`Iteration ${iteration}/${maxIterations} - git status: ${statusLine}`);

    const verify = await runVerifyCommand({ cwd, verifyCmd });
    if (verify.code === 0) {
      log('Verify command passed.');
      return { success: true, message: 'Verification passed.' };
    }

    const logText = `${verify.stdout}\n${verify.stderr}`;
    log('Verify command failed. Attempting fix...');
    const fix = await attemptFix({ cwd, logText });
    if (!fix.applied) {
      log('No fix could be applied. Stopping loop.');
      return { success: false, message: fix.message };
    }
  }

  return { success: false, message: 'Max iterations reached without success.' };
}

async function cloneOrUpdateRepo({ repoUrl, workdir }) {
  const repoName = path.basename(repoUrl, '.git');
  const targetDir = path.join(workdir, repoName);

  try {
    await fs.access(targetDir);
    log(`Repo already cloned at ${targetDir}. Fetching updates...`);
    await runCommand('git fetch --all', { cwd: targetDir });
  } catch {
    log(`Cloning ${repoUrl} into ${targetDir}`);
    await runCommand(`git clone ${repoUrl} ${targetDir}`, { cwd: workdir });
  }

  return targetDir;
}

async function checkoutCommit({ cwd, sha, branch }) {
  await runCommand(`git checkout ${branch}`, { cwd });
  await runCommand('git pull', { cwd });
  await runCommand(`git checkout ${sha}`, { cwd });
}

async function createRepairBranch({ cwd, sha }) {
  const shortSha = sha.slice(0, 7);
  const branchName = `repair/${shortSha}`;
  await runCommand(`git checkout -b ${branchName}`, { cwd });
  return branchName;
}

async function commitAndOpenPr({ cwd, branchName, baseBranch, message }) {
  const status = await runCommand('git status --porcelain', { cwd });
  if (!status.stdout.trim()) {
    log('No changes to commit.');
    return false;
  }

  await runCommand(`git add .`, { cwd });
  await runCommand(`git commit -m "${message}"`, { cwd });
  await runCommand(`git push -u origin ${branchName}`, { cwd });

  const prTitle = message;
  const prBody = `Automated fix from repair-agent.\n\nBase branch: ${baseBranch}`;
  await runCommand(`gh pr create --title "${prTitle}" --body "${prBody}" --base ${baseBranch} --head ${branchName}`, { cwd });
  return true;
}

async function handleFailingRun({ repoUrl, branch, sha, runId, verifyCmd }) {
  const workdir = process.env.REPAIR_WORKDIR || path.join(os.tmpdir(), 'repair-agent');
  await fs.mkdir(workdir, { recursive: true });

  const repoDir = await cloneOrUpdateRepo({ repoUrl, workdir });
  await checkoutCommit({ cwd: repoDir, sha, branch });
  const repairBranch = await createRepairBranch({ cwd: repoDir, sha });

  const logResult = await runCommand(`gh run view ${runId} --log`, { cwd: repoDir });
  const logText = `${logResult.stdout}\n${logResult.stderr}`;

  const loopResult = await runRepairLoop({ cwd: repoDir, verifyCmd });
  if (!loopResult.success) {
    log(`Repair failed: ${loopResult.message}`);
    return false;
  }

  const commitMessage = `Fix CI failure (${classifyFailure(logText)}) for ${sha.slice(0, 7)}`;
  return commitAndOpenPr({ cwd: repoDir, branchName: repairBranch, baseBranch: branch, message: commitMessage });
}

async function pollBranch({ repoUrl, branch, verifyCmd, intervalMs = DEFAULT_POLL_INTERVAL_MS }) {
  log(`Polling branch ${branch} every ${intervalMs}ms`);
  let lastSeenRun = null;

  while (true) {
    const result = await runCommand(
      `gh run list --branch ${branch} --status completed --limit 1 --json databaseId,conclusion,headSha`,
    );

    if (result.code !== 0) {
      log(`gh run list failed: ${result.stderr || result.stdout}`);
    } else {
      const runs = JSON.parse(result.stdout || '[]');
      const run = runs[0];
      if (run && run.conclusion === 'failure' && run.databaseId !== lastSeenRun) {
        lastSeenRun = run.databaseId;
        log(`Detected failing run ${run.databaseId} for ${run.headSha}`);
        await handleFailingRun({
          repoUrl,
          branch,
          sha: run.headSha,
          runId: run.databaseId,
          verifyCmd,
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function startWebhookServer({ repoUrl, branch, verifyCmd, port = 7331 }) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }

    try {
      const payload = JSON.parse(body);
      if (payload.workflow_run?.conclusion === 'failure') {
        await handleFailingRun({
          repoUrl,
          branch,
          sha: payload.workflow_run.head_sha,
          runId: payload.workflow_run.id,
          verifyCmd,
        });
      }
      res.writeHead(200);
      res.end('ok');
    } catch (error) {
      res.writeHead(400);
      res.end(`invalid payload: ${error.message}`);
    }
  });

  server.listen(port, () => {
    log(`Webhook server listening on port ${port}`);
  });
}

function parseArgs() {
  const args = new Map();
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.split('=');
    args.set(key.replace(/^--/, ''), value ?? true);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const mode = args.get('mode') || 'local-loop';
  const repoUrl = args.get('repo') || process.env.REPAIR_REPO_URL;
  const branch = args.get('branch') || process.env.REPAIR_BRANCH || 'main';
  const verifyCmd = args.get('verify') || DEFAULT_VERIFY_CMD;

  if (mode === 'local-loop') {
    const result = await runRepairLoop({ cwd: process.cwd(), verifyCmd });
    if (!result.success) process.exit(1);
    return;
  }

  if (!repoUrl) {
    throw new Error('repo URL is required for polling/webhook modes (set --repo or REPAIR_REPO_URL).');
  }

  if (mode === 'poll') {
    await pollBranch({ repoUrl, branch, verifyCmd });
    return;
  }

  if (mode === 'webhook') {
    const port = Number.parseInt(args.get('port') || process.env.REPAIR_WEBHOOK_PORT || '7331', 10);
    startWebhookServer({ repoUrl, branch, verifyCmd, port });
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main().catch((error) => {
  log(`Fatal: ${error.message}`);
  process.exit(1);
});
