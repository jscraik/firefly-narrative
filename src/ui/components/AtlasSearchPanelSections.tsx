import type {
	AtlasCapabilities,
	AtlasDoctorRebuildSummary,
	AtlasDoctorReport,
	AtlasError,
	AtlasGetSessionResponse,
	AtlasIntrospect,
	AtlasSearchHit,
} from "../../core/atlas-api";

export type AtlasInfoState = {
	loading: boolean;
	error: AtlasError | null;
	capabilities: AtlasCapabilities | null;
	introspect: AtlasIntrospect | null;
	doctor: AtlasDoctorReport | null;
};

export function formatIsoMaybe(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString();
}

export function formatHitMeta(hit: AtlasSearchHit): string {
	const tool = hit.sessionTool ?? "Unknown tool";
	const model = hit.sessionModel ? ` · ${hit.sessionModel}` : "";
	const time = hit.sessionImportedAt
		? ` · ${formatIsoMaybe(hit.sessionImportedAt)}`
		: "";
	return `${tool}${model}${time}`;
}

export function summarizeObject(obj: unknown): string {
	try {
		return JSON.stringify(obj, null, 2);
	} catch {
		return String(obj);
	}
}

export function AtlasControlsCard(props: {
	query: string;
	setQuery: (value: string) => void;
	rebuildLoading: boolean;
	info: AtlasInfoState;
	selectedHit: AtlasSearchHit | null;
	rebuildError: AtlasError | null;
	rebuildSummary: AtlasDoctorRebuildSummary | null;
	capabilitySummary: string | null;
	onRebuild: () => void;
	onRefreshInfo: () => void;
	onClearSelection: () => void;
}) {
	const {
		query,
		setQuery,
		rebuildLoading,
		info,
		selectedHit,
		rebuildError,
		rebuildSummary,
		capabilitySummary,
		onRebuild,
		onRefreshInfo,
		onClearSelection,
	} = props;

	return (
		<div className="card p-5">
			<div className="section-header">ATLAS SEARCH</div>
			<div className="mt-1 text-xs text-text-tertiary">
				Search your imported sessions (lexical, prefix-based).
			</div>

			<div className="mt-3 flex flex-col gap-2">
				<label
					htmlFor="atlas-search-input"
					className="text-xs font-medium text-text-secondary"
				>
					Search sessions
				</label>
				<input
					id="atlas-search-input"
					type="text"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Type to search…"
					className="w-full rounded-md border border-border-light bg-bg-primary px-3 py-2 text-sm text-text-secondary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
					aria-describedby="atlas-search-help"
					autoComplete="off"
					spellCheck={false}
				/>
				<div id="atlas-search-help" className="text-xs text-text-tertiary">
					Tip: use a few keywords; results update as you type.
				</div>

				<div className="mt-2 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={onRebuild}
						disabled={rebuildLoading}
						className="inline-flex items-center gap-2 rounded-md bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-border-light disabled:opacity-60"
					>
						{rebuildLoading ? "Rebuilding…" : "Rebuild index"}
					</button>

					<button
						type="button"
						onClick={onRefreshInfo}
						disabled={info.loading}
						className="inline-flex items-center gap-2 rounded-md bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-border-light disabled:opacity-60"
					>
						{info.loading ? "Refreshing…" : "Refresh status"}
					</button>

					{selectedHit ? (
						<button
							type="button"
							onClick={onClearSelection}
							className="inline-flex items-center gap-2 rounded-md bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-border-light"
						>
							Clear selection
						</button>
					) : null}
				</div>

				{rebuildError ? (
					<div className="mt-2 text-xs text-accent-red">
						Rebuild error: {rebuildError.code}: {rebuildError.message}
					</div>
				) : null}

				{rebuildSummary ? (
					<div className="mt-2 text-xs text-text-tertiary">
						Rebuild complete: {summarizeObject(rebuildSummary)}
					</div>
				) : null}

				{info.error ? (
					<div className="mt-2 text-xs text-accent-red">
						Atlas status error: {info.error.code}: {info.error.message}
					</div>
				) : null}

				{capabilitySummary ? (
					<div className="mt-2 text-xs text-text-tertiary">
						{capabilitySummary}
					</div>
				) : null}

				<details className="mt-2">
					<summary className="cursor-pointer text-xs text-text-secondary">
						Capabilities / Introspect / Doctor (raw)
					</summary>
					<div className="mt-2 grid grid-cols-1 gap-3">
						<pre className="max-h-40 overflow-auto rounded-md bg-bg-primary p-3 text-[0.6875rem] text-text-secondary">
							{summarizeObject(info.capabilities)}
						</pre>
						<pre className="max-h-40 overflow-auto rounded-md bg-bg-primary p-3 text-[0.6875rem] text-text-secondary">
							{summarizeObject(info.introspect)}
						</pre>
						<pre className="max-h-40 overflow-auto rounded-md bg-bg-primary p-3 text-[0.6875rem] text-text-secondary">
							{summarizeObject(info.doctor)}
						</pre>
					</div>
				</details>
			</div>
		</div>
	);
}

export function AtlasResultsCard(props: {
	searchError: AtlasError | null;
	searchLoading: boolean;
	query: string;
	results: AtlasSearchHit[];
	truncated: boolean;
	selectedHit: AtlasSearchHit | null;
	onSelectHit: (hit: AtlasSearchHit) => void;
}) {
	const {
		searchError,
		searchLoading,
		query,
		results,
		truncated,
		selectedHit,
		onSelectHit,
	} = props;

	return (
		<div className="card p-5">
			<div className="section-header">RESULTS</div>

			{searchError ? (
				<div className="mt-2 text-xs text-accent-red">
					Search error: {searchError.code}: {searchError.message}
				</div>
			) : null}

			{searchLoading ? (
				<div className="mt-2 text-sm text-text-tertiary">Searching…</div>
			) : null}

			{!searchLoading &&
			query.trim().length > 0 &&
			results.length === 0 &&
			!searchError ? (
				<div className="mt-2 text-sm text-text-tertiary">No results.</div>
			) : null}

			{truncated ? (
				<div className="mt-2 text-xs text-text-tertiary">
					Results truncated by server budget.
				</div>
			) : null}

			<ul
				className="mt-3 flex flex-col gap-2"
				aria-label="Atlas search results"
			>
				{results.map((hit) => {
					const key = `${hit.sessionId}:${hit.chunkUid}`;
					const isSelected =
						selectedHit?.chunkUid === hit.chunkUid &&
						selectedHit?.sessionId === hit.sessionId;
					return (
						<li key={key}>
							<button
								type="button"
								onClick={() => onSelectHit(hit)}
								className={[
									"w-full rounded-md border px-3 py-2 text-left transition-colors",
									isSelected
										? "border-accent-blue bg-accent-blue-light"
										: "border-border-light bg-bg-primary hover:bg-border-light",
								].join(" ")}
							>
								<div className="flex flex-col gap-1">
									<div className="text-xs font-medium text-text-secondary">
										{formatHitMeta(hit)}
									</div>
									<div className="text-[0.6875rem] text-text-tertiary">
										Chunk {hit.chunkIndex} · score {hit.score.toFixed(2)}
									</div>
									<div className="break-words whitespace-pre-wrap text-xs text-text-tertiary">
										{hit.snippet || "(no snippet)"}
									</div>
								</div>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export function AtlasSessionPreviewCard(props: {
	selectedHit: AtlasSearchHit | null;
	sessionError: AtlasError | null;
	sessionLoading: boolean;
	selectedSession: AtlasGetSessionResponse | null;
}) {
	const { selectedHit, sessionError, sessionLoading, selectedSession } = props;
	if (!selectedHit) return null;

	return (
		<div className="card p-5">
			<div className="section-header">SESSION PREVIEW</div>
			<div className="mt-1 text-xs text-text-tertiary">
				Selected: {selectedHit.sessionId} · {selectedHit.chunkUid}
			</div>

			{sessionError ? (
				<div className="mt-2 text-xs text-accent-red">
					Load error: {sessionError.code}: {sessionError.message}
				</div>
			) : null}

			{sessionLoading ? (
				<div className="mt-2 text-sm text-text-tertiary">Loading session…</div>
			) : null}

			{!sessionLoading && selectedSession ? (
				<div className="mt-3 flex flex-col gap-3">
					<div className="text-xs text-text-secondary">
						<span className="font-medium">{selectedSession.session.tool}</span>
						{selectedSession.session.model
							? ` · ${selectedSession.session.model}`
							: ""}
						{selectedSession.session.importedAt
							? ` · ${formatIsoMaybe(selectedSession.session.importedAt)}`
							: ""}
						{selectedSession.session.durationMin != null
							? ` · ${selectedSession.session.durationMin} min`
							: ""}
						{selectedSession.session.messageCount != null
							? ` · ${selectedSession.session.messageCount} msgs`
							: ""}
						{selectedSession.session.purgedAt
							? ` · purged ${formatIsoMaybe(selectedSession.session.purgedAt)}`
							: ""}
					</div>

					<div className="flex flex-col gap-2">
						{selectedSession.chunks.map((chunk) => (
							<div
								key={chunk.chunkUid}
								className="rounded-md border border-border-light bg-bg-primary p-3"
							>
								<div className="text-[0.6875rem] text-text-tertiary">
									Chunk {chunk.chunkIndex} · {chunk.roleMask}
								</div>
								<div className="mt-1 break-words whitespace-pre-wrap text-xs text-text-secondary">
									{chunk.text}
								</div>
							</div>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
