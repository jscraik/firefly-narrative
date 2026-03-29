import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import {
	BookOpen,
	Compass,
	FileText,
	FolderOpen,
	GitBranch,
	LayoutDashboard,
	Waypoints,
} from "lucide-react";
import type { ReactNode } from "react";

import type { Mode } from "../../core/types";

type ModeMeta = {
	label: string;
	note: string;
	section:
		| "Narrative"
		| "Evidence"
		| "Workspace"
		| "Integrations"
		| "Health"
		| "Configure";
};

type QuickRoute = {
	mode: Mode;
	label: string;
};

const MODE_LABELS: Record<Mode, ModeMeta> = {
	dashboard: {
		label: "Narrative Brief",
		note: "Dense operator overview for what moved, what is risky, and where to verify next.",
		section: "Narrative",
	},
	repo: {
		label: "Repo Evidence",
		note: "Commit-linked files, diffs, sessions, and snapshots for branch verification.",
		section: "Workspace",
	},
	sessions: {
		label: "Sessions",
		note: "Indexed session ledger with join confidence, follow-through, and next action.",
		section: "Evidence",
	},
	tools: {
		label: "Tools",
		note: "Tool posture, usage, and follow-through stay grouped under the Tools lane.",
		section: "Integrations",
	},
	hygiene: {
		label: "Hygiene",
		note: "Trust, environment, setup, and capture follow-through in one operational lane.",
		section: "Health",
	},
	settings: {
		label: "Settings",
		note: "Docs, scan roots, provider posture, and operator defaults in one configuration lane.",
		section: "Configure",
	},
};

const sectionIcon = {
	Narrative: LayoutDashboard,
	Evidence: Waypoints,
	Workspace: GitBranch,
	Integrations: Compass,
	Health: FileText,
	Configure: BookOpen,
} as const;

function buildSecondaryRoutes(mode: Mode): QuickRoute[] {
	const routes: QuickRoute[] = [];

	if (mode !== "repo") {
		routes.push({ mode: "repo", label: MODE_LABELS.repo.label });
	}

	if (mode !== "dashboard") {
		routes.push({ mode: "dashboard", label: MODE_LABELS.dashboard.label });
	}

	return routes;
}

export function TopNav(props: {
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	repoPath?: string | null;
	onOpenRepo: () => void;
	onImportSession?: () => void;
	onImportKimiSession?: () => void;
	onImportAgentTrace?: () => void;
	importEnabled?: boolean;
	children?: ReactNode;
}) {
	const {
		mode,
		onModeChange,
		repoPath,
		onOpenRepo,
		onImportSession,
		onImportKimiSession,
		onImportAgentTrace,
		importEnabled,
		children,
	} = props;

	const currentModeMeta = MODE_LABELS[mode];
	const CurrentSectionIcon = sectionIcon[currentModeMeta.section];
	const secondaryRoutes = buildSecondaryRoutes(mode);

	return (
		<header className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border-light bg-bg-secondary px-4 ">
			<div className="flex min-w-0 items-center gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-[0.625rem] font-medium uppercase tracking-[0.15em] text-text-muted">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-bg-primary px-2 py-0.5 text-text-secondary">
							<CurrentSectionIcon className="h-3 w-3" />
							{currentModeMeta.section}
						</span>
					</div>
					<div className="mt-1.5 flex flex-wrap items-center gap-3">
						<span className="truncate text-[0.9375rem] font-semibold text-text-primary">
							{currentModeMeta.label}
						</span>
						<span className="hidden truncate text-xs text-text-muted xl:block">
							{currentModeMeta.note}
						</span>

						<div className="hidden items-center gap-2 lg:flex ml-2">
							{secondaryRoutes.map((route) => (
								<button
									key={route.mode}
									type="button"
									onClick={() => onModeChange(route.mode)}
									className="inline-flex items-center gap-2 rounded-full border border-border-light bg-bg-primary px-3 py-1 text-[0.6875rem] font-medium text-text-secondary transition hover:border-accent-blue-light hover:text-text-primary shadow-sm"
								>
									{route.label}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3 justify-self-end">
				{repoPath ? (
					<div
						className="hidden max-w-[32ch] truncate rounded-full border border-border-light bg-bg-primary px-3 py-1 text-xs text-text-muted xl:block"
						title={repoPath}
					>
						{repoPath}
					</div>
				) : null}

				<ImportMenu
					onImportSession={onImportSession}
					onImportKimiSession={onImportKimiSession}
					onImportAgentTrace={onImportAgentTrace}
					importEnabled={importEnabled}
				/>

				{children}

				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-lg bg-accent-blue px-3 py-1.5 text-sm font-medium text-accent-foreground shadow-sm transition hover:brightness-95"
					onClick={onOpenRepo}
				>
					<FolderOpen className="h-4 w-4" />
					Open repo...
				</button>
			</div>
		</header>
	);
}

function ImportMenu(props: {
	onImportSession?: () => void;
	onImportKimiSession?: () => void;
	onImportAgentTrace?: () => void;
	importEnabled?: boolean;
}) {
	const {
		onImportSession,
		onImportKimiSession,
		onImportAgentTrace,
		importEnabled,
	} = props;

	if (!onImportSession && !onImportKimiSession && !onImportAgentTrace)
		return null;

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-bg-primary px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-accent-blue-light hover:text-text-primary"
				>
					Import
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					sideOffset={8}
					align="end"
					className="z-50 min-w-[14rem] rounded-2xl border border-border-light bg-bg-primary p-2 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.7)]"
				>
					{onImportSession ? (
						<DropdownMenu.Item
							onSelect={onImportSession}
							disabled={importEnabled === false}
							className={menuItemClass}
						>
							Import Codex Session
						</DropdownMenu.Item>
					) : null}
					{onImportKimiSession ? (
						<DropdownMenu.Item
							onSelect={onImportKimiSession}
							className={menuItemClass}
						>
							Import Kimi Session
						</DropdownMenu.Item>
					) : null}
					{onImportAgentTrace ? (
						<DropdownMenu.Item
							onSelect={onImportAgentTrace}
							className={menuItemClass}
						>
							Import Agent Trace
						</DropdownMenu.Item>
					) : null}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

const menuItemClass = clsx(
	"rounded-xl px-3 py-2 text-sm text-text-secondary outline-none transition",
	"data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
	"data-[highlighted]:bg-bg-secondary data-[highlighted]:text-text-primary",
);
