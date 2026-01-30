import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const repoFlagIndex = args.indexOf("--repo");
const endpointFlagIndex = args.indexOf("--endpoint");

const repoRoot = repoFlagIndex >= 0 ? args[repoFlagIndex + 1] : process.cwd();
const endpoint = endpointFlagIndex >= 0 ? args[endpointFlagIndex + 1] : "http://127.0.0.1:4318/v1/logs";

if (!repoRoot) {
  console.error("Missing --repo <path> or run from a repo root.");
  process.exit(1);
}

const fixturePath = path.join(repoRoot, "fixtures/otel/codex-otel-sample.json");
if (!fs.existsSync(fixturePath)) {
  console.error(`Fixture not found: ${fixturePath}`);
  process.exit(1);
}

let commitSha = "";
try {
  commitSha = execSync("git rev-parse HEAD", { cwd: repoRoot }).toString().trim();
} catch (error) {
  console.error("Failed to resolve HEAD commit. Run inside a git repo.");
  console.error(String(error));
  process.exit(1);
}

let filePath = "";
try {
  const fileList = execSync("git show --name-only --pretty=\"\" HEAD", { cwd: repoRoot })
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  filePath = fileList[0] ?? "README.md";
} catch {
  filePath = "README.md";
}

let raw = fs.readFileSync(fixturePath, "utf-8");
raw = raw.replace("__COMMIT_SHA__", commitSha).replace("__FILE_PATH__", filePath);

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: raw
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Codex OTel smoke test failed (${response.status}): ${body}`);
  process.exit(1);
}

console.log("Codex OTel smoke test sent.");
console.log(`Endpoint: ${endpoint}`);
console.log(`Commit: ${commitSha}`);
console.log(`File: ${filePath}`);
console.log("If Narrative is running with this repo open, you should see a new trace badge shortly.");
