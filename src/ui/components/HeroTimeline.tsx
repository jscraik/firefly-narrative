import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TimelineNode } from '../../core/types';
import type { FireflyEvent } from '../../hooks/useFirefly';
import { useTimelineNavigation } from '../../hooks/useTimelineNavigation';
import { BadgePill } from './BadgePill';
import { FireflySignal } from './FireflySignal';
import { TimelineNodeComponent } from './TimelineNode';

export interface FireflyTrackingSettlePayload {
  selectedNodeId: string;
  x: number;
  y: number;
}

export interface HeroTimelineProps {
  nodes: TimelineNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pulseCommitId?: string | null;
  fireflyEvent?: FireflyEvent;
  fireflyDisabled?: boolean;
  fireflyBurstType?: 'success' | 'error' | null;
  onFireflyTrackingSettled?: (payload: FireflyTrackingSettlePayload) => void;
}

/**
 * HeroTimeline — The timeline as the hero element of the Command Center.
 *
 * Larger, more prominent, center stage. This is the primary navigation
 * for understanding the trace through the branch's history.
 */
export function HeroTimeline({
  nodes,
  selectedId,
  onSelect,
  pulseCommitId,
  fireflyEvent = { type: 'idle', selectedNodeId: null },
  fireflyDisabled = false,
  fireflyBurstType = null,
  onFireflyTrackingSettled,
}: HeroTimelineProps) {
  const {
    containerRef,
    sorted,
    hasPrev,
    hasNext,
    scrollToNode,
  } = useTimelineNavigation({ nodes, selectedId, onSelect });

  // Firefly position tracking
  const [fireflyPos, setFireflyPos] = useState({ x: 0, y: 0 });
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const settleRafRef = useRef<number | null>(null);
  const keyboardPulseTimerRef = useRef<number | null>(null);
  const [keyboardPulseId, setKeyboardPulseId] = useState<string | null>(null);

  const scheduleKeyboardPulseClear = useCallback(() => {
    if (keyboardPulseTimerRef.current !== null) {
      window.clearTimeout(keyboardPulseTimerRef.current);
      keyboardPulseTimerRef.current = null;
    }

    keyboardPulseTimerRef.current = window.setTimeout(() => {
      setKeyboardPulseId(null);
      keyboardPulseTimerRef.current = null;
    }, 300);
  }, []);

  const measureFireflyPosition = useCallback(() => {
    if (!selectedId) return null;
    const node = nodeRefs.current.get(selectedId);
    const container = containerRef.current;
    if (!node || !container) return null;

    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextPos = {
      x: nodeRect.left - containerRect.left + container.scrollLeft,
      y: nodeRect.top - containerRect.top,
    };

    setFireflyPos(nextPos);
    return nextPos;
  }, [selectedId, containerRef]);

  useEffect(() => {
    if (!selectedId) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let settleRafA = 0;
    let settleRafB = 0;

    const runSettleCheck = () => {
      const first = measureFireflyPosition();
      if (!first) return;

      settleRafA = window.requestAnimationFrame(() => {
        const second = measureFireflyPosition();
        if (!second || cancelled) return;

        const stableX = Math.abs(first.x - second.x) <= 1;
        const stableY = Math.abs(first.y - second.y) <= 1;

        if (stableX && stableY) {
          onFireflyTrackingSettled?.({
            selectedNodeId: selectedId,
            x: second.x,
            y: second.y,
          });
        } else {
          settleRafB = window.requestAnimationFrame(runSettleCheck);
          settleRafRef.current = settleRafB;
        }
      });
      settleRafRef.current = settleRafA;
    };

    runSettleCheck();

    const handleScroll = () => {
      measureFireflyPosition();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', runSettleCheck);

    return () => {
      cancelled = true;
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', runSettleCheck);
      window.cancelAnimationFrame(settleRafA);
      window.cancelAnimationFrame(settleRafB);
      if (settleRafRef.current !== null) {
        window.cancelAnimationFrame(settleRafRef.current);
      }
    };
  }, [measureFireflyPosition, onFireflyTrackingSettled, selectedId, containerRef]);

  useEffect(() => {
    return () => {
      if (keyboardPulseTimerRef.current !== null) {
        window.clearTimeout(keyboardPulseTimerRef.current);
      }
    };
  }, []);

  const maskWidth = 40;
  const maskStyle = {
    maskImage: `linear-gradient(to right, transparent, black ${maskWidth}px, black calc(100% - ${maskWidth}px), transparent)`,
    WebkitMaskImage: `linear-gradient(to right, transparent, black ${maskWidth}px, black calc(100% - ${maskWidth}px), transparent)`,
  };

  return (
    <div className="relative flex flex-col bg-gradient-to-b from-bg-tertiary to-bg-secondary rounded-2xl border border-border-subtle shadow-lg overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
          <span className="text-sm font-medium text-text-secondary">Trace Timeline</span>
        </div>
        <div className="text-xs text-text-muted">
          {sorted.length} events · click to explore
        </div>
      </div>

      {/* Timeline container */}
      <div className="flex items-center gap-4 py-6">
        {/* Left nav */}
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => scrollToNode('prev')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-primary border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all ml-4"
          aria-label="Previous commit"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable timeline */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-x-auto no-scrollbar scroll-smooth"
          tabIndex={0}
          role="listbox"
          aria-label="Commit timeline"
          style={maskStyle}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scrollToNode('prev');
              const idx = sorted.findIndex(n => n.id === selectedId);
              if (idx > 0) {
                const prevId = sorted[idx - 1].id;
                setKeyboardPulseId(prevId);
                scheduleKeyboardPulseClear();
              }
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              scrollToNode('next');
              const idx = sorted.findIndex(n => n.id === selectedId);
              if (idx >= 0 && idx < sorted.length - 1) {
                const nextId = sorted[idx + 1].id;
                setKeyboardPulseId(nextId);
                scheduleKeyboardPulseClear();
              }
            }
          }}
        >
          {/* Connection line - hero style */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] h-[2px] bg-gradient-to-r from-transparent via-border-subtle to-transparent" />

          <motion.div
            className="relative flex min-w-max items-start gap-3 px-6 py-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.03 }
              }
            }}
          >
            {sorted.map((n) => (
              <motion.div
                key={n.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
              >
                <TimelineNodeComponent
                  ref={(el) => {
                    if (el) nodeRefs.current.set(n.id, el);
                    else nodeRefs.current.delete(n.id);
                  }}
                  node={n}
                  selected={selectedId === n.id}
                  pulsing={pulseCommitId === n.id || keyboardPulseId === n.id}
                  onSelect={() => onSelect(n.id)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Firefly Signal */}
          <FireflySignal
            x={fireflyPos.x}
            y={fireflyPos.y}
            event={fireflyEvent}
            disabled={fireflyDisabled}
            burstType={fireflyBurstType}
          />
        </div>

        {/* Right nav */}
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => scrollToNode('next')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-primary border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all mr-4"
          aria-label="Next commit"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Re-export for convenience
export { BadgePill };
