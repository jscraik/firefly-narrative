import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CircleDot, FileCode2 } from "lucide-react";
import type { ComponentType } from "react";
import { Eyebrow } from "../typography/Eyebrow";

export type DashboardLane = {
	title: string;
	detail: string;
	action: () => void;
	icon: ComponentType<{ className?: string }>;
};

export function NextLanesCard(props: {
	sessionLane: DashboardLane[];
	shouldReduceMotion: boolean | null;
	onImportSession: () => void;
}) {
	const { sessionLane, shouldReduceMotion, onImportSession } = props;

	return (
		<article className="rounded-2xl border border-border-subtle bg-bg-subtle p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<Eyebrow>Next lanes</Eyebrow>
					<h3 className="mt-1 text-base font-semibold text-text-primary">
						Keep Codex asks inside proof
					</h3>
				</div>
				<button
					type="button"
					onClick={onImportSession}
					className="inline-flex items-center gap-2 rounded-full border border-border-light bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-accent-blue-light hover:text-text-primary"
				>
					Import session
				</button>
			</div>

			<div className="mt-3 grid gap-2.5">
				{sessionLane.map((lane) => (
					<motion.button
						key={lane.title}
						type="button"
						onClick={lane.action}
						whileTap={shouldReduceMotion ? { opacity: 0.8 } : { scale: 0.98 }}
						className="flex w-full items-start gap-3 rounded-xl border border-border-light bg-bg-primary p-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent-blue-light hover:bg-bg-primary active:scale-[0.98] active:duration-75"
					>
						<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-accent-blue">
							<lane.icon className="h-3.5 w-3.5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm font-semibold text-text-primary">
									{lane.title}
								</p>
								<ArrowRight className="h-3.5 w-3.5 text-text-muted" />
							</div>
							<p className="mt-0.5 line-clamp-2 text-xs leading-5 text-text-secondary">
								{lane.detail}
							</p>
						</div>
					</motion.button>
				))}
			</div>
		</article>
	);
}

export function PressureWatchCard(props: {
	linkedFile:
		| {
				filePath: string;
				aiPercentage: number;
				commitCount: number;
		  }
		| undefined;
	nextFile:
		| {
				filePath: string;
		  }
		| undefined;
	trustIsHealthy: boolean;
}) {
	const { linkedFile, nextFile, trustIsHealthy } = props;

	return (
		<article className="rounded-3xl border border-border-subtle bg-bg-subtle p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<Eyebrow>Pressure watch</Eyebrow>
					<h3 className="mt-1 text-base font-semibold text-text-primary">
						Lanes that need operator attention
					</h3>
				</div>
				<span className="rounded-full border border-border-light bg-bg-primary px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-secondary">
					3 signals
				</span>
			</div>

			<div className="mt-4 grid gap-3">
				<article className="group rounded-xl border border-border-light bg-bg-primary p-4 transition-all duration-200 ease-out hover:border-accent-blue-light/50 hover:bg-bg-primary active:scale-[0.98] active:duration-75">
					<div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
						<CircleDot className="h-4 w-4 text-accent-blue" />
						Evidence concentration
					</div>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						{linkedFile
							? `${linkedFile.filePath} carries the strongest evidence signal at ${linkedFile.aiPercentage.toFixed(0)}% AI across ${linkedFile.commitCount} commits.`
							: "No evidence-ranked file available yet."}
					</p>
				</article>

				<article className="group rounded-xl border border-border-light bg-bg-primary p-4 transition-all duration-200 ease-out hover:border-accent-blue-light/50 hover:bg-bg-primary active:scale-[0.98] active:duration-75">
					<div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
						<AlertTriangle
							className={`h-4 w-4 ${trustIsHealthy ? "text-accent-green" : "text-accent-amber"}`}
						/>
						Trust posture
					</div>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						{trustIsHealthy
							? "Capture looks stable enough for direct repo inspection."
							: "Trust is degraded — branch conclusions should stay provisional until the trust gate is reviewed."}
					</p>
				</article>

				<article className="group rounded-xl border border-border-light bg-bg-primary p-4 transition-all duration-200 ease-out hover:border-accent-blue-light/50 hover:bg-bg-primary active:scale-[0.98] active:duration-75">
					<div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
						<FileCode2 className="h-4 w-4 text-accent-violet" />
						Second file to inspect
					</div>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						{nextFile
							? `${nextFile.filePath} is the next best evidence hop if the first file does not explain the branch shift.`
							: "The current window is thin — the first evidence hop likely owns most of the story."}
					</p>
				</article>
			</div>
		</article>
	);
}
