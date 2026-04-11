#!/usr/bin/env bash
# Local environment preflight (strict)
# Fails fast when required tooling is missing.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"
	ATTESTATION_PATH="$REPO_ROOT/artifacts/policy/environment-attestation.json"
	MISE_PATH="$REPO_ROOT/.mise.toml"
	CODEX_ENVIRONMENT_PATH="$REPO_ROOT/.codex/environments/environment.toml"
	MAKEFILE_PATH="$REPO_ROOT/Makefile"
	PREK_CONFIG_PATH="$REPO_ROOT/prek.toml"
	PACKAGE_JSON_PATH="$REPO_ROOT/package.json"
	TOOLING_DOC_PATH="${TOOLING_DOC_PATH:-$REPO_ROOT/docs/agents/tooling.md}"

if [[ ! -f "$CONTRACT_PATH" ]]; then
	echo "Error: missing contract file at $CONTRACT_PATH"
	exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
	echo "Error: required binary 'rg' is not installed or not on PATH"
	exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
	echo "Error: required binary 'jq' is not installed or not on PATH"
	exit 1
fi

	if [[ ! -f "$MISE_PATH" ]]; then
		echo "Error: missing mise config at $MISE_PATH"
		exit 1
	fi

	if [[ ! -f "$CODEX_ENVIRONMENT_PATH" ]]; then
		echo "Error: missing Codex environment file at $CODEX_ENVIRONMENT_PATH"
		exit 1
	fi

	if [[ ! -f "$MAKEFILE_PATH" ]]; then
		echo "Error: missing required Makefile at $MAKEFILE_PATH"
		exit 1
	fi

	if [[ ! -f "$PREK_CONFIG_PATH" ]]; then
		echo "Error: missing required prek config at $PREK_CONFIG_PATH"
		exit 1
	fi

	required_support_files=("scripts/codex-preflight.sh" "scripts/check-staged-secrets.sh" "scripts/check-doc-style.sh" "scripts/check-related-tests.sh" "scripts/check-semgrep-changed.sh" "scripts/semgrep-pre-push.yml")
	for support_file in "${required_support_files[@]}"; do
		if [[ ! -f "$REPO_ROOT/${support_file}" ]]; then
			echo "Error: missing required hook support file at $REPO_ROOT/${support_file}"
			exit 1
		fi
	done

if ! command -v mise >/dev/null 2>&1; then
	echo "Error: required binary 'mise' is not installed or not on PATH"
	exit 1
fi

# Bootstrap the full repo-managed environment so hook validation reflects the
# pinned runtime versions and required approval posture, not only the caller
# shell's PATH.
eval "$(mise activate bash)"
export CLAUDE_APPROVAL_POSTURE="${CLAUDE_APPROVAL_POSTURE:-require}"

required_mise_tools=()
while IFS= read -r tool; do
	required_mise_tools+=("$tool")
done < <(jq -er '.toolingPolicy.requiredMiseTools[].tool' "$CONTRACT_PATH")

if [[ "${#required_mise_tools[@]}" -eq 0 ]]; then
	echo "Error: no required mise tools found in $CONTRACT_PATH (.toolingPolicy.requiredMiseTools)"
	exit 1
fi

for tool in "${required_mise_tools[@]}"; do
	tool_pattern="$(printf '%s' "$tool" | sed 's/[][(){}.^$*+?|\\]/\\&/g')"
	if ! rg -q "^[[:space:]]*(\"${tool_pattern}\"|${tool_pattern})[[:space:]]*=" "$MISE_PATH"; then
		echo "Error: required tool '$tool' is not pinned in $MISE_PATH [tools]"
		echo "Fix: add '$tool = \"<version>\"' to $MISE_PATH."
		exit 1
	fi
done

if [[ -f "$TOOLING_DOC_PATH" ]]; then
	required_tooling_doc_terms=()
	while IFS= read -r term; do
		required_tooling_doc_terms+=("$term")
	done < <(jq -er '.toolingPolicy.requiredDocumentationTerms[]' "$CONTRACT_PATH")

	if [[ "${#required_tooling_doc_terms[@]}" -eq 0 ]]; then
		echo "Error: no required documentation terms found in $CONTRACT_PATH (.toolingPolicy.requiredDocumentationTerms)"
		exit 1
	fi

	for term in "${required_tooling_doc_terms[@]}"; do
		if ! rg -qi "(^|[^A-Za-z0-9_-])${term}([^A-Za-z0-9_-]|$)" "$TOOLING_DOC_PATH"; then
			echo "Error: tooling doc missing expected term '$term': $TOOLING_DOC_PATH"
			echo "Fix: update tooling inventory and keep it aligned with $MISE_PATH."
			echo "Interactive flow: run a Codex AskQuestion/request_user_input prompt before applying installs."
			exit 1
		fi
	done
else
	echo "Warning: tooling doc not found at $TOOLING_DOC_PATH; skipping doc sync check."
fi

	required_bins=()
	while IFS= read -r bin; do
		required_bins+=("$bin")
	done < <(jq -er '.toolingPolicy.requiredBinaries[]' "$CONTRACT_PATH")

	if [[ "${#required_bins[@]}" -eq 0 ]]; then
		echo "Error: no required binaries found in $CONTRACT_PATH (.toolingPolicy.requiredBinaries)"
		exit 1
	fi

	for bin in "${required_bins[@]}"; do
		if ! command -v "$bin" >/dev/null 2>&1; then
			echo "Error: required binary '$bin' is not installed or not on PATH"
			exit 1
		fi
	done

	required_codex_actions=()
	while IFS= read -r action; do
		required_codex_actions+=("$action")
	done < <(jq -er '.toolingPolicy.codexEnvironment.requiredActions[] | "\(.name)|\(.icon)"' "$CONTRACT_PATH")

	if [[ "${#required_codex_actions[@]}" -eq 0 ]]; then
		echo "Error: no required Codex actions found in $CONTRACT_PATH (.toolingPolicy.codexEnvironment.requiredActions)"
		exit 1
	fi

	for action in "${required_codex_actions[@]}"; do
		name="${action%%|*}"
		icon="${action##*|}"
		if ! awk -v name="$name" -v icon="$icon" '
			prev == "name = \"" name "\"" && $0 == "icon = \"" icon "\"" { found = 1 }
			{ prev = $0 }
			END { exit found ? 0 : 1 }
		' "$CODEX_ENVIRONMENT_PATH"; then
			echo "Error: Codex environment action '$name' is missing or mapped to the wrong icon in $CODEX_ENVIRONMENT_PATH"
			exit 1
		fi
	done

	required_make_targets=("help" "install" "setup" "preflight" "hooks" "hooks-pre-commit" "hooks-pre-push" "hooks-commit-msg" "secrets-staged" "docs-style-changed" "related-tests" "semgrep-changed" "diagrams-check" "lint" "docs-lint" "fmt" "typecheck" "test" "check" "audit" "secrets" "security" "clean" "reset" "ci" "diagrams" "tooling-doc" "env-check")
	for target in "${required_make_targets[@]}"; do
		if ! rg -q "^${target}:" "$MAKEFILE_PATH"; then
			echo "Error: required Makefile target '$target' is missing from $MAKEFILE_PATH"
			exit 1
		fi
	done

	python3 - "$PREK_CONFIG_PATH" <<'PY'
import sys
import tomllib

prek_path = sys.argv[1]
with open(prek_path, "rb") as fh:
    data = tomllib.load(fh)

expected_types = {"pre-commit", "pre-push", "commit-msg"}
actual_types = set(data.get("default_install_hook_types", []))
if actual_types != expected_types:
    print(
        f"Error: default_install_hook_types mismatch in {prek_path}: "
        f"expected {sorted(expected_types)}, found {sorted(actual_types)}"
    )
    sys.exit(1)

repos = data.get("repos", [])
local_repo = next((repo for repo in repos if repo.get("repo") == "local"), None)
if not local_repo:
    print(f"Error: missing [[repos]] repo = \"local\" in {prek_path}")
    sys.exit(1)

hooks = {
    hook.get("id"): hook
    for hook in local_repo.get("hooks", [])
    if isinstance(hook, dict) and hook.get("id")
}
expected_hooks = {
    "pre-commit": {
        "name": "Pre-commit quality gate",
        "entry": "make hooks-pre-commit",
        "language": "system",
        "pass_filenames": False,
        "stages": None,
    },
    "pre-push": {
        "name": "Pre-push governance gate",
        "entry": "make hooks-pre-push",
        "language": "system",
        "pass_filenames": False,
        "stages": ["pre-push"],
    },
    "commit-msg": {
        "name": "Commit message validation",
        "entry": "node scripts/validate-commit-msg.js",
        "language": "system",
        "pass_filenames": True,
        "stages": ["commit-msg"],
    },
}

for hook_id, expected in expected_hooks.items():
    hook = hooks.get(hook_id)
    if not hook:
        print(f"Error: required prek hook '{hook_id}' is missing from {prek_path}")
        sys.exit(1)
    if hook.get("entry") != expected["entry"]:
        print(
            f"Error: prek hook '{hook_id}' entry mismatch in {prek_path}: "
            f"expected {expected['entry']!r}, found {hook.get('entry')!r}"
        )
        sys.exit(1)
    if hook.get("name") != expected["name"]:
        print(
            f"Error: prek hook '{hook_id}' name mismatch in {prek_path}: "
            f"expected {expected['name']!r}, found {hook.get('name')!r}"
        )
        sys.exit(1)
    if hook.get("language") != expected["language"]:
        print(
            f"Error: prek hook '{hook_id}' language mismatch in {prek_path}: "
            f"expected {expected['language']!r}, found {hook.get('language')!r}"
        )
        sys.exit(1)
    if hook.get("pass_filenames") is not expected["pass_filenames"]:
        print(
            f"Error: prek hook '{hook_id}' pass_filenames mismatch in {prek_path}: "
            f"expected {expected['pass_filenames']!r}, found {hook.get('pass_filenames')!r}"
        )
        sys.exit(1)
    expected_stages = expected["stages"]
    actual_stages = hook.get("stages")
    if expected_stages is None:
        if actual_stages is not None:
            print(
                f"Error: prek hook '{hook_id}' should not declare stages in {prek_path}"
            )
            sys.exit(1)
    elif actual_stages != expected_stages:
        print(
            f"Error: prek hook '{hook_id}' stages mismatch in {prek_path}: "
            f"expected {expected_stages!r}, found {actual_stages!r}"
        )
        sys.exit(1)
PY

	if [[ -f "$PACKAGE_JSON_PATH" ]]; then
		required_package_scripts=("secrets:staged|bash scripts/check-staged-secrets.sh" "docs:style:changed|bash scripts/check-doc-style.sh" "test:related|bash scripts/check-related-tests.sh" "semgrep:changed|bash scripts/check-semgrep-changed.sh")
		for script_spec in "${required_package_scripts[@]}"; do
			script_name="${script_spec%%|*}"
			script_command="${script_spec#*|}"
			if ! jq -e --arg script_name "$script_name" --arg script_command "$script_command" '
				(.scripts // {})[$script_name] == $script_command
			' "$PACKAGE_JSON_PATH" >/dev/null; then
				echo "Error: package script '$script_name' is missing or out of date in $PACKAGE_JSON_PATH"
				echo "Fix: run node scripts/setup-git-hooks.js"
				exit 1
			fi
		done

		if jq -e 'has("simple-git-hooks")' "$PACKAGE_JSON_PATH" >/dev/null; then
			echo "Error: legacy package.json hook config should not be present in $PACKAGE_JSON_PATH"
			echo "Fix: remove legacy package-level hook config and use node scripts/setup-git-hooks.js with prek."
			exit 1
		fi
		if jq -e '((.scripts // {}) | has("prepare")) or ((.scripts // {}) | has("postinstall"))' "$PACKAGE_JSON_PATH" >/dev/null; then
			echo "Error: legacy hook bootstrap scripts prepare/postinstall should not be present in $PACKAGE_JSON_PATH"
			echo "Fix: remove legacy package-level hook bootstrap scripts and use node scripts/setup-git-hooks.js with prek."
			exit 1
		fi
		if jq -e '((.dependencies // {}) | has("simple-git-hooks")) or ((.devDependencies // {}) | has("simple-git-hooks"))' "$PACKAGE_JSON_PATH" >/dev/null; then
			echo "Error: legacy package hook dependency should not be present in $PACKAGE_JSON_PATH"
			echo "Fix: remove the legacy package hook dependency from package.json and reinstall dependencies."
			exit 1
		fi

		has_package_marker() {
			local marker="$1"
			jq -e --arg marker "$marker" '
				((.dependencies // {}) + (.devDependencies // {})) | has($marker)
			' "$PACKAGE_JSON_PATH" >/dev/null
		}

		repo_capabilities=()
		explicit_capabilities=()
		for capability in "${explicit_capabilities[@]}"; do
			[[ -n "$capability" ]] || continue
			repo_capabilities+=("$capability")
		done
		ui_markers=("react" "react-dom" "next" "vite" "tailwindcss" "@storybook/react" "@storybook/react-vite" "@radix-ui/react-slot")
		for marker in "${ui_markers[@]}"; do
			if has_package_marker "$marker"; then
				repo_capabilities+=("ui")
				break
			fi
		done

		chatgpt_apps_sdk_markers=("@openai/chatkit" "@openai/agents" "@openai/agents-realtime")
		for marker in "${chatgpt_apps_sdk_markers[@]}"; do
			if has_package_marker "$marker"; then
				repo_capabilities+=("chatgpt_apps_sdk")
				break
			fi
		done

		has_capability() {
			local wanted="$1"
			for capability in "${repo_capabilities[@]}"; do
				if [[ "$capability" == "$wanted" ]]; then
					return 0
				fi
			done
			return 1
		}

		has_required_package() {
			local pkg="$1"
			local dependency_type="$2"
			case "$dependency_type" in
				dependencies)
					jq -e --arg pkg "$pkg" '(.dependencies // {}) | has($pkg)' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				devDependencies)
					jq -e --arg pkg "$pkg" '(.devDependencies // {}) | has($pkg)' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				either)
					jq -e --arg pkg "$pkg" '((.dependencies // {}) | has($pkg)) or ((.devDependencies // {}) | has($pkg))' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				*)
					return 1
					;;
			esac
		}

		required_package_specs=("@brainwav/design-system-guidance|either|ui,chatgpt_apps_sdk")
		for spec in "${required_package_specs[@]}"; do
			pkg="${spec%%|*}"
			rest="${spec#*|}"
			dependency_type="${rest%%|*}"
			required_caps_csv="${rest#*|}"
			should_apply=0
			IFS=',' read -r -a required_caps <<< "$required_caps_csv"
			for capability in "${required_caps[@]}"; do
				if has_capability "$capability"; then
					should_apply=1
					break
				fi
		done
			if [[ "$should_apply" -eq 1 ]] && ! has_required_package "$pkg" "$dependency_type"; then
				echo "Error: required package '$pkg' is missing from $PACKAGE_JSON_PATH for explicit or detected UI/App SDK capabilities"
				echo "Fix: npm i $pkg"
				exit 1
			fi
		done
	fi

	mkdir -p "$REPO_ROOT/artifacts/policy"

echo "Running harness environment preflight..."

run_check_environment_with_runner() {
	local label="$1"
	shift
	local -a runner=("$@")
	local output=""
	local exit_code=0

	rm -f "$ATTESTATION_PATH"

	echo "Using harness runner: $label"
	set +e
	output="$("${runner[@]}" check-environment \
		--contract "$CONTRACT_PATH" \
		--json \
		--attestation "$ATTESTATION_PATH" 2>&1)"
	exit_code=$?
	set -e

	if [[ -n "$output" ]]; then
		printf '%s\n' "$output"
	fi

	if [[ "$exit_code" -ne 0 ]]; then
		echo "Runner failed: $label (exit $exit_code)"
		return 1
	fi

	if [[ ! -f "$ATTESTATION_PATH" ]]; then
		local json_line
		json_line="$(printf '%s\n' "$output" | awk '/^\{/{line=$0} END{if(line!="") print line}')"
		if [[ -n "$json_line" ]]; then
			printf '%s\n' "$json_line" > "$ATTESTATION_PATH"
		fi
	fi

	if [[ ! -f "$ATTESTATION_PATH" ]]; then
		echo "Runner produced no attestation output: $label"
		return 1
	fi

	return 0
}

if ! command -v npm >/dev/null 2>&1; then
	echo "Error: npm is required to validate global harness installation."
	exit 1
fi

if ! npm ls -g --depth=0 @brainwav/coding-harness >/dev/null 2>&1; then
	echo "Error: @brainwav/coding-harness is not installed globally via npm."
	echo "Install globally and retry:"
	echo "  npm i -g @brainwav/coding-harness"
	echo "Private registry auth is required:"
	echo "  - Local shell: export NPM_TOKEN=<token>"
	echo "  - CI (CircleCI): set NPM_TOKEN as a project environment variable in CircleCI project settings"
	exit 1
fi

if ! command -v harness >/dev/null 2>&1; then
	echo "Error: global harness binary is not on PATH after npm installation."
	echo "Fix: ensure npm global bin directory is on PATH, then retry."
	exit 1
fi

if ! run_check_environment_with_runner "global npm harness ($(command -v harness))" harness; then
	echo "Error: global npm harness failed to run check-environment successfully."
	echo "Reinstall and retry:"
	echo "  npm i -g @brainwav/coding-harness"
	echo "If this is CI (CircleCI), confirm NPM_TOKEN is set as a project environment variable."
	exit 1
fi

jq -e '.passed == true' "$ATTESTATION_PATH" >/dev/null
echo "Environment check passed (attestation: $ATTESTATION_PATH)"
