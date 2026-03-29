import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	AtlasDoctorRebuildSummary,
	AtlasError,
} from "../../core/atlas-api";
import {
	atlasCapabilities,
	atlasDoctorRebuildDerived,
	atlasDoctorReport,
	atlasIntrospect,
} from "../../core/atlas-api";
import { useAtlasSearch } from "../../hooks/useAtlasSearch";
import {
	AtlasControlsCard,
	type AtlasInfoState,
	AtlasResultsCard,
	AtlasSessionPreviewCard,
} from "./AtlasSearchPanelSections";

export function AtlasSearchPanel(props: { repoId: number | null }) {
	const { repoId } = props;
	const infoRequestVersionRef = useRef(0);
	const rebuildRequestVersionRef = useRef(0);

	const [info, setInfo] = useState<AtlasInfoState>({
		loading: false,
		error: null,
		capabilities: null,
		introspect: null,
		doctor: null,
	});

	const [rebuildLoading, setRebuildLoading] = useState(false);
	const [rebuildError, setRebuildError] = useState<AtlasError | null>(null);
	const [rebuildSummary, setRebuildSummary] =
		useState<AtlasDoctorRebuildSummary | null>(null);

	const {
		query,
		setQuery,
		loading: searchLoading,
		error: searchError,
		results,
		truncated,
		selectedHit,
		selectHit,
		sessionLoading,
		sessionError,
		selectedSession,
		clearSelection,
		refreshSelectedSession,
	} = useAtlasSearch(repoId);

	const refreshInfo = useCallback(async () => {
		if (!repoId) return;
		const requestVersion = infoRequestVersionRef.current + 1;
		infoRequestVersionRef.current = requestVersion;
		const isStaleRequest = () =>
			infoRequestVersionRef.current !== requestVersion;

		setInfo((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const [capEnv, introEnv, doctorEnv] = await Promise.all([
				atlasCapabilities(),
				atlasIntrospect(repoId),
				atlasDoctorReport(repoId),
			]);
			if (isStaleRequest()) return;

			if (!capEnv.ok) {
				setInfo({
					loading: false,
					error: capEnv.error,
					capabilities: null,
					introspect: null,
					doctor: null,
				});
				return;
			}
			if (!introEnv.ok) {
				setInfo({
					loading: false,
					error: introEnv.error,
					capabilities: capEnv.value,
					introspect: null,
					doctor: null,
				});
				return;
			}
			if (!doctorEnv.ok) {
				setInfo({
					loading: false,
					error: doctorEnv.error,
					capabilities: capEnv.value,
					introspect: introEnv.value,
					doctor: null,
				});
				return;
			}

			setInfo({
				loading: false,
				error: null,
				capabilities: capEnv.value,
				introspect: introEnv.value,
				doctor: doctorEnv.value,
			});
		} catch (e: unknown) {
			if (isStaleRequest()) return;
			setInfo({
				loading: false,
				error: {
					code: "INTERNAL",
					message: e instanceof Error ? e.message : String(e),
				},
				capabilities: null,
				introspect: null,
				doctor: null,
			});
		}
	}, [repoId]);

	useEffect(() => {
		infoRequestVersionRef.current += 1;
		rebuildRequestVersionRef.current += 1;

		if (!repoId) {
			setInfo({
				loading: false,
				error: null,
				capabilities: null,
				introspect: null,
				doctor: null,
			});
			setRebuildLoading(false);
			setRebuildError(null);
			setRebuildSummary(null);
			return;
		}

		setRebuildLoading(false);
		setRebuildError(null);
		setRebuildSummary(null);
		void refreshInfo();
	}, [repoId, refreshInfo]);

	const handleRebuild = useCallback(async () => {
		if (!repoId) return;
		const requestVersion = rebuildRequestVersionRef.current + 1;
		rebuildRequestVersionRef.current = requestVersion;
		const isStaleRebuild = () =>
			rebuildRequestVersionRef.current !== requestVersion;

		setRebuildLoading(true);
		setRebuildError(null);
		setRebuildSummary(null);

		try {
			// atlas_doctor_rebuild_derived expects args: { request: { repoId } }
			const env = await atlasDoctorRebuildDerived(repoId);
			if (isStaleRebuild()) {
				setRebuildLoading(false);
				return;
			}
			if (!env.ok) {
				setRebuildLoading(false);
				setRebuildError(env.error);
				return;
			}

			setRebuildSummary(env.value);
			setRebuildLoading(false);

			await refreshInfo();
			if (isStaleRebuild()) {
				setRebuildLoading(false);
				return;
			}
			await refreshSelectedSession();
		} catch (e: unknown) {
			if (isStaleRebuild()) {
				setRebuildLoading(false);
				return;
			}
			setRebuildLoading(false);
			setRebuildError({
				code: "INTERNAL",
				message: e instanceof Error ? e.message : String(e),
			});
		}
	}, [repoId, refreshInfo, refreshSelectedSession]);

	const capabilitySummary = useMemo(() => {
		if (!info.capabilities) return null;
		const fts5 = info.capabilities.fts5Enabled;
		const ftsReady = info.capabilities.ftsTableReady;
		const derived = info.capabilities.derivedVersion;

		const ftsStr = fts5 ? "FTS5 enabled" : "FTS5 disabled";
		const readyStr = ftsReady ? "FTS table ready" : "FTS table missing";
		return `${ftsStr} · ${readyStr} · derived: ${derived}`;
	}, [info.capabilities]);

	if (!repoId) {
		return (
			<div className="card p-5">
				<div className="section-header">ATLAS SEARCH</div>
				<div className="mt-2 text-sm text-text-tertiary">
					Select a repo to use Atlas search.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<AtlasControlsCard
				query={query}
				setQuery={setQuery}
				rebuildLoading={rebuildLoading}
				info={info}
				selectedHit={selectedHit}
				rebuildError={rebuildError}
				rebuildSummary={rebuildSummary}
				capabilitySummary={capabilitySummary}
				onRebuild={handleRebuild}
				onRefreshInfo={() => void refreshInfo()}
				onClearSelection={clearSelection}
			/>

			<AtlasResultsCard
				searchError={searchError}
				searchLoading={searchLoading}
				query={query}
				results={results}
				truncated={truncated}
				selectedHit={selectedHit}
				onSelectHit={selectHit}
			/>

			<AtlasSessionPreviewCard
				selectedHit={selectedHit}
				sessionError={sessionError}
				sessionLoading={sessionLoading}
				selectedSession={selectedSession}
			/>
		</div>
	);
}
