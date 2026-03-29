import clsx from "clsx";
import {
	Database,
	GitBranch,
	LayoutDashboard,
	MessagesSquare,
	Search,
	Settings,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Mode } from "../../core/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SidebarProps {
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	onOpenRepo?: () => void;
	onImportSession?: () => void;
}

interface NavEntry {
	id: Mode;
	label: string;
	icon: ComponentType<{ className?: string }>;
	badge?: ReactNode;
	status?: string;
}

const VISIBLE_NAV_ITEMS: NavEntry[] = [
	{ id: "dashboard", label: "Narrative Brief", icon: LayoutDashboard },
	{ id: "repo", label: "Repo Evidence", icon: GitBranch },
	{ id: "sessions", label: "Sessions", icon: MessagesSquare },
	{ id: "tools", label: "Tools", icon: Sparkles },
	{ id: "hygiene", label: "Hygiene", icon: ShieldCheck },
	{ id: "settings", label: "Settings", icon: Settings },
];

function NavItem({
	id,
	label,
	icon: Icon,
	badge,
	status,
	activeMode,
	onModeChange,
}: NavEntry & { activeMode: Mode; onModeChange: (mode: Mode) => void }) {
	const isActive = activeMode === id;

	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			onClick={() => onModeChange(id)}
			className={clsx(
				"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:scale-[0.98]",
				isActive
					? "nav-item-active shadow-sm"
					: "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
			)}
		>
			<Icon className="w-4 h-4 shrink-0" />
			<span className="flex-1 text-left truncate">{label}</span>
			{badge !== undefined && (
				<span
					className={clsx(
						"text-[0.625rem] rounded px-1.5 py-0.5 font-medium shrink-0",
						typeof badge === "number"
							? "text-accent-blue"
							: "bg-bg-tertiary text-text-muted",
					)}
				>
					{badge}
				</span>
			)}
			{status && (
				<span className="text-[0.625rem] rounded bg-accent-green-bg px-1.5 py-0.5 font-medium text-accent-green shrink-0">
					{status}
				</span>
			)}
		</button>
	);
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export function Sidebar({
	mode,
	onModeChange,
	onOpenRepo,
	onImportSession,
}: SidebarProps) {
	return (
		<aside className="w-56 flex-shrink-0 flex flex-col border-r border-border-subtle bg-bg-subtle h-screen sticky top-0">
			{/* Brand */}
			<div className="h-14 flex items-center gap-3 px-4 border-b border-border-subtle cursor-default select-none">
				<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-violet-bg/70 border border-border-subtle">
					<Zap className="w-5 h-5 text-accent-violet" />
				</div>
				<span className="font-bold text-sm tracking-tight text-text-primary">
					Trace Narrative
				</span>
			</div>

			{/* Nav scroll area */}
			<div className="relative flex-1 min-h-0">
				<div
					role="tablist"
					aria-label="Sidebar mode navigation"
					className="absolute inset-0 overflow-y-auto px-3 py-4"
				>
					<div className="space-y-1">
						{VISIBLE_NAV_ITEMS.map((item) => (
							<NavItem
								key={item.id}
								{...item}
								activeMode={mode}
								onModeChange={onModeChange}
							/>
						))}
					</div>

					<div className="mt-6 border-t border-border-subtle pt-4">
						<div className="space-y-1">
							<button
								type="button"
								onClick={onOpenRepo}
								className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:scale-[0.98]"
							>
								<GitBranch className="w-4 h-4" />
								<span className="flex-1 text-left">Open Repo</span>
							</button>
							<button
								type="button"
								onClick={onImportSession}
								className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:scale-[0.98]"
							>
								<Database className="w-4 h-4" />
								<span className="flex-1 text-left">Import Session</span>
							</button>
						</div>
					</div>
				</div>

				{/* Scroll-indicator gradient fade */}
				<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-subtle to-transparent" />
			</div>

			{/* Footer / Search */}
			<div className="p-3 border-t border-border-subtle">
				<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-subtle text-text-muted cursor-pointer hover:bg-bg-hover transition-colors">
					<Search className="w-3.5 h-3.5" />
					<span className="text-xs">Quick search...</span>
					<span className="ml-auto rounded border border-border-subtle px-1 text-[0.625rem] opacity-50">
						⌘K
					</span>
				</div>
			</div>
		</aside>
	);
}
