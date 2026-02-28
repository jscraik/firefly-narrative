import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import type { BranchHeaderViewModel, BranchViewModel, FileChange } from '../../core/types';
import { BranchHero } from '../components/BranchHero';
import { BranchNarrativePanel } from '../components/BranchNarrativePanel';
import { DecisionArchaeologyPanel } from '../components/DecisionArchaeologyPanel';
import { FilesChanged } from '../components/FilesChanged';
import { HeroTimeline } from '../components/HeroTimeline';
import { ImportErrorBanner } from '../components/ImportErrorBanner';
import { IngestToast } from '../components/IngestToast';
import { IntentList } from '../components/IntentList';
import { NarrativeGovernancePanel } from '../components/NarrativeGovernancePanel';
import { NeedsAttentionList } from '../components/NeedsAttentionList';
import { TraceDetailModal, DetailSection } from '../components/TraceDetailModal';
import { CaptureActivityStrip } from '../components/CaptureActivityStrip';
import { SessionExcerpts } from '../components/SessionExcerpts';
import { AgentTraceSummary } from '../components/AgentTraceSummary';
import { DiffViewer } from '../components/DiffViewer';
import { PANEL } from './branchView.constants';

interface BranchViewLayoutProps {
  isExitingFilteredView?: boolean;
  ingestToast?: { id: string; message: string } | null;
  stage: number;
  model: BranchViewModel;
  headerViewModel: BranchHeaderViewModel;
  onClearFilter?: () => void;
  narrativePanelProps: ComponentProps<typeof BranchNarrativePanel>;
  governanceProps: ComponentProps<typeof NarrativeGovernancePanel>;
  archaeologyProps: ComponentProps<typeof DecisionArchaeologyPanel>;
  captureActivityProps?: ComponentProps<typeof CaptureActivityStrip> | null;
  ingestIssuesProps?: ComponentProps<typeof NeedsAttentionList> | null;
  selectedNode: BranchViewModel['timeline'][number] | null;
  loadingFiles: boolean;
  files: FileChange[];
  selectedNodeId: string | null;
  actionError?: string | null;
  onDismissActionError?: () => void;
  rightPanelProps: ComponentProps<typeof HeroTimeline>;
  timelineProps: ComponentProps<typeof HeroTimeline>;
}

/**
 * BranchViewLayout — Minimal Command Center Pattern
 *
 * A clean, focused interface where the timeline is the hero.
 * Details are revealed on demand through modal interaction.
 *
 * Structure:
 * - Minimal header (BranchHero)
 * - Hero timeline (center stage)
 * - Expandable detail pills (Intent, Governance)
 * - Modal for commit details on selection
 */
export function BranchViewLayout({
  isExitingFilteredView,
  ingestToast,
  stage,
  model,
  headerViewModel,
  onClearFilter,
  narrativePanelProps,
  governanceProps,
  archaeologyProps,
  captureActivityProps,
  ingestIssuesProps,
  selectedNode,
  loadingFiles,
  files,
  selectedNodeId,
  actionError,
  onDismissActionError,
  rightPanelProps,
  timelineProps,
}: BranchViewLayoutProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Open detail modal when a node is selected
  const handleNodeSelect = (id: string) => {
    timelineProps.onSelect(id);
    setDetailModalOpen(true);
  };

  // Get selected node details
  const selectedCommit = selectedNode?.type === 'commit' ? selectedNode : null;
  const selectedSession = model.sessionExcerpts?.find(
    (s) => s.linkedCommitSha === selectedNodeId
  );

  return (
    <div className={`flex h-full flex-col motion-page-enter ${isExitingFilteredView ? 'animate-out fade-out slide-out-to-top-2 motion-page-exit fill-mode-forwards' : ''}`}>
      <IngestToast toast={ingestToast ?? null} />

      {/* Minimal Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : -10 }}
        transition={{ duration: 0.2 }}
      >
        <BranchHero
          model={model}
          onBack={onClearFilter}
          isFilteredView={headerViewModel.kind === 'full' && headerViewModel.isFilteredView}
        />
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col gap-6 p-6 bg-bg-tertiary">
        {/* Hero Timeline - Center Stage */}
        <motion.div
          initial={{ opacity: 0, y: PANEL.initialY }}
          animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? PANEL.finalY : PANEL.initialY }}
          transition={PANEL.spring}
          className="flex-shrink-0"
        >
          <HeroTimeline
            {...timelineProps}
            onSelect={handleNodeSelect}
          />
        </motion.div>

        {/* Expandable Detail Pills */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
            {/* Narrative Summary - Compact */}
            <motion.details
              className="group card overflow-hidden"
              initial={{ opacity: 0, y: PANEL.initialY }}
              animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? PANEL.finalY : PANEL.initialY }}
              transition={PANEL.spring}
              open
            >
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary transition-colors p-4 select-none list-none">
                <span className="w-4 h-4 flex items-center justify-center rounded-sm bg-bg-primary group-open:bg-bg-hover transition-colors">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="none">
                    <title>Toggle narrative</title>
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Narrative</span>
              </summary>
              <div className="px-4 pb-4">
                <BranchNarrativePanel {...narrativePanelProps} />
              </div>
            </motion.details>

            {/* Intent - Compact */}
            {model.intent.length > 0 && (
              <motion.details
                className="group card overflow-hidden"
                initial={{ opacity: 0, y: PANEL.initialY }}
                animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? PANEL.finalY : PANEL.initialY }}
                transition={PANEL.spring}
              >
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary transition-colors p-4 select-none list-none">
                  <span className="w-4 h-4 flex items-center justify-center rounded-sm bg-bg-primary group-open:bg-bg-hover transition-colors">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="none">
                      <title>Toggle intent</title>
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>Intent</span>
                  <span className="text-xs text-text-muted ml-auto">{model.intent.length} items</span>
                </summary>
                <div className="px-4 pb-4">
                  <IntentList items={model.intent} />
                </div>
              </motion.details>
            )}

            {/* Ingest Issues */}
            {ingestIssuesProps && (
              <motion.div
                initial={{ opacity: 0, y: PANEL.initialY }}
                animate={{ opacity: stage >= 5 ? 1 : 0, y: stage >= 5 ? PANEL.finalY : PANEL.initialY }}
                transition={PANEL.spring}
              >
                <NeedsAttentionList {...ingestIssuesProps} />
              </motion.div>
            )}

            {/* Error Banner */}
            {actionError && (
              <ImportErrorBanner
                error={actionError}
                onDismiss={onDismissActionError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal for Selected Commit */}
      <TraceDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={selectedCommit?.label || selectedCommit?.id.slice(0, 8) || 'Commit Details'}
        subtitle={selectedCommit?.timestamp || undefined}
      >
        <div className="space-y-6">
          {/* Files Changed */}
          <DetailSection icon={undefined} title="Files Changed" defaultOpen>
            {loadingFiles ? (
              <div className="text-sm text-text-muted">Loading files...</div>
            ) : files.length > 0 ? (
              <FilesChanged
                files={files}
                title=""
                traceByFile={selectedNodeId ? model.traceSummaries?.byFileByCommit[selectedNodeId] : undefined}
              />
            ) : (
              <div className="text-sm text-text-muted">No files changed in this commit</div>
            )}
          </DetailSection>

          {/* Session Transcript */}
          {selectedSession && (
            <DetailSection icon={undefined} title="Session Transcript" defaultOpen={false}>
              <SessionExcerpts
                excerpts={[selectedSession]}
                selectedId={selectedSession.id}
                onSelect={() => {}}
              />
            </DetailSection>
          )}

          {/* AI Attribution */}
          {selectedNodeId && model.traceSummaries?.byCommit[selectedNodeId] && (
            <DetailSection icon={undefined} title="AI Attribution" defaultOpen={false}>
              <AgentTraceSummary
                summary={model.traceSummaries.byCommit[selectedNodeId]}
                status={{ kind: 'loaded' }}
              />
            </DetailSection>
          )}

          {/* Governance & Archaeology */}
          <DetailSection icon={undefined} title="Governance & Decisions" defaultOpen={false}>
            <div className="space-y-4">
              <NarrativeGovernancePanel {...governanceProps} />
              <DecisionArchaeologyPanel {...archaeologyProps} />
            </div>
          </DetailSection>
        </div>
      </TraceDetailModal>
    </div>
  );
}
