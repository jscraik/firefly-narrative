import type { ReactNode } from "react";
import { HelpPopover } from "../HelpPopover";
import { Toggle } from "../Toggle";
import type { DetectionStatus } from "./autoIngestSetupTypes";

export function AutoIngestToggleCard(props: {
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
}) {
	const { enabled, onToggle } = props;
	return (
		<div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3">
			<div className="flex flex-col gap-1">
				<span className="text-xs font-medium text-text-secondary">
					Enable auto‑ingest
				</span>
				<span className="text-[0.6875rem] text-text-tertiary">
					Process logs in background
				</span>
			</div>
			<Toggle
				checked={enabled}
				onCheckedChange={(checked) => onToggle(checked)}
				aria-label="Enable auto-ingest"
			/>
		</div>
	);
}

export function DiscoveryCard(props: {
	autoIngestEnabled: boolean;
	discoveredSummary: string | null;
	detectionStatus: DetectionStatus;
	statusMessage: string | null;
	onAutoDetect: () => void;
}) {
	const {
		autoIngestEnabled,
		discoveredSummary,
		detectionStatus,
		statusMessage,
		onAutoDetect,
	} = props;
	return (
		<div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
			<div className="mb-2 flex flex-wrap items-center gap-2">
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
						autoIngestEnabled
							? "border border-accent-green-light bg-accent-green-bg text-accent-green"
							: "border border-border-subtle bg-bg-tertiary text-text-tertiary"
					}`}
				>
					{autoIngestEnabled ? "Active" : "Inactive"}
				</span>
				{discoveredSummary ? (
					<span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-tertiary px-2 py-0.5 text-[0.6875rem] font-medium text-text-secondary">
						{discoveredSummary}
					</span>
				) : null}
			</div>
			<div className="text-[0.6875rem] text-text-tertiary">
				Add source folders quickly, then save watch paths. Open advanced editor
				only if you need manual path tuning.
			</div>
			<div className="mt-2 flex items-center gap-2">
				<button
					type="button"
					className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold"
					onClick={onAutoDetect}
					disabled={detectionStatus === "searching"}
				>
					{detectionStatus === "searching"
						? "Auto-detecting…"
						: "Auto-detect paths"}
				</button>
				{statusMessage ? (
					<span
						className={`text-[0.6875rem] ${
							detectionStatus === "error"
								? "text-accent-red"
								: detectionStatus === "not-found"
									? "text-accent-orange"
									: "text-text-tertiary"
						}`}
					>
						{statusMessage}
					</span>
				) : null}
			</div>
		</div>
	);
}

export function WatchPathsCard(props: {
	claudePaths: string;
	cursorPaths: string;
	codexPaths: string;
	showAdvancedPaths: boolean;
	onAddClaudeFolder: () => void;
	onAddCursorFolder: () => void;
	onAddCodexFolder: () => void;
	onSaveWatchPaths: () => void;
	onToggleAdvanced: () => void;
	onClaudePathsChange: (next: string) => void;
	onCursorPathsChange: (next: string) => void;
	onCodexPathsChange: (next: string) => void;
}) {
	const {
		claudePaths,
		cursorPaths,
		codexPaths,
		showAdvancedPaths,
		onAddClaudeFolder,
		onAddCursorFolder,
		onAddCodexFolder,
		onSaveWatchPaths,
		onToggleAdvanced,
		onClaudePathsChange,
		onCursorPathsChange,
		onCodexPathsChange,
	} = props;

	return (
		<div className="rounded-lg border border-border-subtle bg-bg-tertiary p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="text-xs font-semibold text-text-secondary">
					Watch Paths
				</div>
				<HelpPopover
					content={
						<div className="space-y-1">
							<p>Locations where Narrator looks for AI conversation logs.</p>
							<p className="font-mono text-[0.625rem] text-text-muted">
								~/.codex/sessions
							</p>
						</div>
					}
				/>
			</div>

			<div className="mt-2 flex flex-wrap gap-2">
				<ActionButton onClick={onAddClaudeFolder}>
					Add Claude folder…
				</ActionButton>
				<ActionButton onClick={onAddCursorFolder}>
					Add Cursor folder…
				</ActionButton>
				<ActionButton onClick={onAddCodexFolder}>
					Add Codex folder…
				</ActionButton>
			</div>

			<div className="mt-3 flex items-center gap-2">
				<button
					type="button"
					className="inline-flex items-center rounded-md border border-accent-blue-light bg-accent-blue-bg px-2 py-1 text-[0.6875rem] font-semibold text-accent-blue transition duration-200 ease-out hover:scale-105 hover:bg-accent-blue-light active:scale-[0.98] active:duration-75"
					onClick={onSaveWatchPaths}
				>
					Save watch paths
				</button>
				<ActionButton onClick={onToggleAdvanced}>
					{showAdvancedPaths ? "Hide advanced editor" : "Show advanced editor"}
				</ActionButton>
			</div>

			{showAdvancedPaths ? (
				<div className="mt-3 space-y-2 rounded-md border border-border-subtle bg-bg-secondary p-2">
					<label
						htmlFor="claude-paths"
						className="text-xs font-semibold text-text-secondary"
					>
						Claude paths (one per line)
					</label>
					<textarea
						id="claude-paths"
						className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
						rows={3}
						value={claudePaths}
						onChange={(event) => onClaudePathsChange(event.target.value)}
					/>
					<label
						htmlFor="cursor-paths"
						className="text-xs font-semibold text-text-secondary"
					>
						Cursor paths (one per line)
					</label>
					<textarea
						id="cursor-paths"
						className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
						rows={3}
						value={cursorPaths}
						onChange={(event) => onCursorPathsChange(event.target.value)}
					/>
					<label
						htmlFor="codex-log-paths"
						className="text-xs font-semibold text-text-secondary"
					>
						Codex paths (one per line)
					</label>
					<textarea
						id="codex-log-paths"
						className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
						rows={2}
						value={codexPaths}
						onChange={(event) => onCodexPathsChange(event.target.value)}
					/>
				</div>
			) : null}
		</div>
	);
}

export function ActionButton(props: {
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void | Promise<void>;
}) {
	const { children, disabled = false, onClick } = props;
	return (
		<button
			type="button"
			className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold transition duration-200 ease-out hover:scale-105 active:scale-[0.98] active:duration-75 disabled:opacity-50"
			disabled={disabled}
			onClick={() => void onClick()}
		>
			{children}
		</button>
	);
}
