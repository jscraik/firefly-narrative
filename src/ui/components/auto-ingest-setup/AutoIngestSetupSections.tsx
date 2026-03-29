import { open as openExternal } from "@tauri-apps/plugin-shell";
import type {
	CaptureReliabilityStatus,
	CollectorMigrationStatus,
} from "../../../core/tauri/ingestConfig";
import { HelpPopover } from "../HelpPopover";
import { ActionButton } from "./AutoIngestSetupControls";

export {
	AutoIngestToggleCard,
	DiscoveryCard,
	WatchPathsCard,
} from "./AutoIngestSetupControls";
export type { DetectionStatus, WatchPaths } from "./autoIngestSetupTypes";

function captureModeClass(captureMode: string) {
	if (captureMode === "HYBRID_ACTIVE")
		return "bg-accent-green-bg text-accent-green border-accent-green-light";
	if (captureMode === "OTEL_ONLY")
		return "bg-accent-blue-bg text-accent-blue border-accent-blue-light";
	if (captureMode === "DEGRADED_STREAMING")
		return "bg-accent-amber-bg text-accent-amber border-accent-amber-light";
	if (captureMode === "FAILURE")
		return "bg-accent-red-bg text-accent-red border-accent-red-light";
	return "bg-bg-tertiary text-text-secondary border-border-subtle";
}

export function PanelHeader() {
	return (
		<div className="flex items-center justify-between">
			<div>
				<div className="section-header">Auto-Ingest Setup</div>
				<div className="section-subheader mt-0.5">connect once</div>
			</div>
			<HelpPopover
				content="Auto-ingest monitors your local AI interaction logs (Claude, Cursor, etc.) and automatically links them to your git commits."
				label="About auto-ingest"
			/>
		</div>
	);
}

export function CaptureModeCard(props: {
	captureMode: string;
	captureReliability: CaptureReliabilityStatus | null | undefined;
	authBusy: boolean;
	onRefreshReliability?: () => void;
	onAuthorize?: () => Promise<void>;
	onLogout?: () => Promise<void>;
}) {
	const {
		captureMode,
		captureReliability,
		authBusy,
		onRefreshReliability,
		onAuthorize,
		onLogout,
	} = props;
	const appServerStatus = captureReliability?.appServer;
	const authUrl = (() => {
		const hint = appServerStatus?.lastError?.trim();
		if (!hint || !hint.startsWith("Complete login in browser:")) return null;
		const value = hint.slice("Complete login in browser:".length).trim();
		if (!value) return null;
		try {
			const parsed = new URL(value);
			if (parsed.protocol !== "https:") return null;
			return parsed.toString();
		} catch {
			return null;
		}
	})();
	const isAuthorized = appServerStatus?.authState === "authenticated";
	const isAuthFlowInProgress = appServerStatus?.authState === "authenticating";
	const hasAuthUrl = Boolean(authUrl);
	const primaryAuthLabel = isAuthorized
		? "Authorized"
		: isAuthFlowInProgress
			? "Authorizing…"
			: "Login for live test";
	const handleLoginInBrowser = async () => {
		if (!authUrl) return;
		try {
			await openExternal(authUrl);
		} catch {
			// Intentionally no-op: caller will still show the URL in status.
		}
	};

	return (
		<div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="text-xs font-semibold text-text-secondary">
					Capture mode
				</div>
				<button
					type="button"
					className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold"
					onClick={() => onRefreshReliability?.()}
				>
					Refresh
				</button>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold border ${captureModeClass(captureMode)}`}
				>
					{captureMode}
				</span>
				{captureReliability?.reasons?.[0] ? (
					<span className="text-[0.6875rem] text-text-tertiary">
						{captureReliability.reasons[0]}
					</span>
				) : (
					<span className="text-[0.6875rem] text-text-tertiary">
						Reliability status not yet available.
					</span>
				)}
			</div>
			{appServerStatus ? (
				<div className="mt-3 rounded-md border border-border-subtle bg-bg-tertiary p-2">
					<div className="text-[0.6875rem] font-semibold text-text-secondary">
						Codex App Server
					</div>
					<div className="mt-1 text-[0.6875rem] text-text-tertiary">
						state: <span className="font-mono">{appServerStatus.state}</span> ·
						auth: <span className="font-mono">{appServerStatus.authState}</span>{" "}
						· initialized:{" "}
						<span className="font-mono">
							{appServerStatus.initialized ? "yes" : "no"}
						</span>
					</div>
					{appServerStatus.authState === "authenticated" ? (
						<div className="mt-1 text-[0.6875rem] text-accent-green">
							Authorization status: logged in and authorized.
						</div>
					) : appServerStatus.lastError ? (
						<div className="mt-1 text-[0.6875rem] text-text-tertiary">
							{appServerStatus.lastError}
						</div>
					) : null}
					<div className="mt-2 flex flex-wrap items-center gap-2">
						{isAuthorized ? (
							<button
								type="button"
								className="inline-flex items-center rounded-full border border-accent-green-light bg-accent-green-bg px-2 py-1 text-[0.6875rem] font-semibold text-accent-green"
								disabled
								onClick={() => void onAuthorize?.()}
							>
								{primaryAuthLabel}
							</button>
						) : (
							<button
								type="button"
								className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold disabled:opacity-50"
								disabled={authBusy}
								onClick={() => void onAuthorize?.()}
							>
								{primaryAuthLabel}
							</button>
						)}
						{hasAuthUrl ? (
							<button
								type="button"
								className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold disabled:opacity-50"
								disabled={authBusy}
								onClick={() => {
									void handleLoginInBrowser();
								}}
							>
								Login
							</button>
						) : null}
						{isAuthorized ? (
							<span className="inline-flex items-center rounded-full px-2 py-1 text-[0.625rem] font-semibold border border-accent-green-light bg-accent-green-bg text-accent-green">
								Logged in
							</span>
						) : null}
						<button
							type="button"
							className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[0.6875rem] font-semibold disabled:opacity-50"
							disabled={authBusy}
							onClick={() => void onLogout?.()}
						>
							Logout
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}

export function CollectorMigrationCard(props: {
	migrationStatus?: CollectorMigrationStatus | null;
	migrationBusy: boolean;
	onMigrateNow: () => Promise<void>;
	onDryRun: () => Promise<void>;
	onRollback: () => Promise<void>;
}) {
	const { migrationStatus, migrationBusy, onMigrateNow, onDryRun, onRollback } =
		props;

	return (
		<div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
			<div className="text-xs font-semibold text-text-secondary">
				Collector migration
			</div>
			<div className="mt-1 text-[0.6875rem] text-text-tertiary">
				Canonical root:{" "}
				<span className="font-mono">
					{migrationStatus?.canonicalRoot ?? "~/.agents/otel-collector"}
				</span>
			</div>
			<div className="mt-1 text-[0.6875rem] text-text-tertiary">
				Legacy root:{" "}
				<span className="font-mono">
					{migrationStatus?.legacyRoot ?? "~/.agents/otel/collector"}
				</span>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold border ${
						migrationStatus?.migrationRequired
							? "bg-accent-amber-bg text-accent-amber border-accent-amber-light"
							: "bg-accent-green-bg text-accent-green border-accent-green-light"
					}`}
				>
					{migrationStatus?.migrationRequired
						? "Migration required"
						: "Canonicalized"}
				</span>
				{migrationStatus?.status ? (
					<span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-tertiary px-2 py-0.5 text-[0.6875rem] text-text-secondary">
						Status: {migrationStatus.status}
					</span>
				) : null}
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				<ActionButton disabled={migrationBusy} onClick={onMigrateNow}>
					{migrationBusy ? "Migrating…" : "Migrate now"}
				</ActionButton>
				<ActionButton disabled={migrationBusy} onClick={onDryRun}>
					Dry run
				</ActionButton>
				<ActionButton disabled={migrationBusy} onClick={onRollback}>
					Rollback
				</ActionButton>
			</div>
			{migrationStatus?.lastError ? (
				<div className="mt-2 text-[0.6875rem] text-accent-red">
					{migrationStatus.lastError}
				</div>
			) : null}
		</div>
	);
}
