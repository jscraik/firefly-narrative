import { ChevronRight, GitBranch, Settings2 } from "lucide-react";
import type { StoryAnchorCommitStatus } from "../../../core/story-anchors-api";
import {
	CommitActionsCard,
	HooksStatusRow,
	RepoActionsCard,
	type RepoAnchorCounts,
} from "./StoryAnchorsSections";

export function StoryAnchorsDisclosure(props: {
	canRun: boolean;
	repoId: number | null;
	hookInstalled: boolean | null;
	hooksDir: string | null;
	busy: boolean;
	repoCounts: RepoAnchorCounts | null;
	exportProgress: {
		done: number;
		total: number;
	} | null;
	indexedCommitCount: number;
	canRunRepoActions: boolean;
	selectedCommitSha: string | null;
	status: StoryAnchorCommitStatus | null;
	canRunCommitActions: boolean;
	message: string | null;
	onInstallHooks: () => void;
	onUninstallHooks: () => void;
	onRefresh: () => void;
	onRefreshIndexedStatus: () => void;
	onImportSessionsNotes: () => void;
	onExportSessionsNotes: () => void;
	onMigrateAttributionRef: () => void;
	onReconcileDryRun: () => void;
	onReconcileWrite: () => void;
	onImportSessionNote: () => void;
	onExportSessionNote: () => void;
	onCommitReconcileNoWrite: () => void;
	onCommitReconcileWrite: () => void;
	onCommitMigrateAttributionRef: () => void;
}) {
	const {
		canRun,
		repoId,
		hookInstalled,
		hooksDir,
		busy,
		repoCounts,
		exportProgress,
		indexedCommitCount,
		canRunRepoActions,
		selectedCommitSha,
		status,
		canRunCommitActions,
		message,
		onInstallHooks,
		onUninstallHooks,
		onRefresh,
		onRefreshIndexedStatus,
		onImportSessionsNotes,
		onExportSessionsNotes,
		onMigrateAttributionRef,
		onReconcileDryRun,
		onReconcileWrite,
		onImportSessionNote,
		onExportSessionNote,
		onCommitReconcileNoWrite,
		onCommitReconcileWrite,
		onCommitMigrateAttributionRef,
	} = props;

	const hooksLabel =
		hookInstalled === null
			? "hooks: ?"
			: hookInstalled
				? "hooks: on"
				: "hooks: off";
	const hooksColor =
		hookInstalled === null
			? "text-text-muted"
			: hookInstalled
				? "text-accent-green"
				: "text-text-muted";
	const anchorsLabel = repoCounts
		? `${repoCounts.complete}/${repoCounts.total} anchors`
		: "0 anchors";

	if (!canRun) {
		return (
			<div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
				<Settings2 className="h-3.5 w-3.5" />
				<span>Trace Narrative</span>
				<span className="text-text-muted/60">— open a repo to manage</span>
			</div>
		);
	}

	return (
		<details className="group mt-4">
			<summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors select-none hover:bg-bg-hover">
				<span className="flex h-4 w-4 items-center justify-center rounded-sm bg-bg-primary transition-colors group-open:bg-bg-hover">
					<ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
				</span>
				<GitBranch className="h-3.5 w-3.5 text-text-secondary" />
				<span className="font-medium text-text-secondary">Trace Narrative</span>
				<span className={`text-[0.625rem] ${hooksColor}`}>{hooksLabel}</span>
				<span className="text-[0.625rem] text-text-muted">
					· {anchorsLabel}
				</span>
			</summary>

			<div className="mt-3 flex flex-col gap-3 rounded-lg border border-border-light bg-bg-secondary p-3">
				<HooksStatusRow
					hookInstalled={hookInstalled}
					hooksDir={hooksDir}
					busy={busy}
					canRun={Boolean(repoId)}
					onInstallHooks={onInstallHooks}
					onUninstallHooks={onUninstallHooks}
					onRefresh={onRefresh}
				/>

				<RepoActionsCard
					indexedCount={indexedCommitCount}
					repoCounts={repoCounts}
					exportProgress={exportProgress}
					busy={busy}
					canRunRepoActions={canRunRepoActions}
					onRefreshIndexedStatus={onRefreshIndexedStatus}
					onImportSessionsNotes={onImportSessionsNotes}
					onExportSessionsNotes={onExportSessionsNotes}
					onMigrateAttributionRef={onMigrateAttributionRef}
					onReconcileDryRun={onReconcileDryRun}
					onReconcileWrite={onReconcileWrite}
				/>

				{selectedCommitSha ? (
					<CommitActionsCard
						selectedCommitSha={selectedCommitSha}
						status={status}
						busy={busy}
						canRunCommitActions={canRunCommitActions}
						onImportSessionNote={onImportSessionNote}
						onExportSessionNote={onExportSessionNote}
						onReconcileNoWrite={onCommitReconcileNoWrite}
						onReconcileWrite={onCommitReconcileWrite}
						onMigrateAttributionRef={onCommitMigrateAttributionRef}
					/>
				) : (
					<div className="text-[0.6875rem] text-text-muted">
						Select a commit to manage its session link note.
					</div>
				)}

				{message ? (
					<div className="text-[0.6875rem] text-text-muted">{message}</div>
				) : null}
			</div>
		</details>
	);
}
