import { useEffect, useRef, useState } from 'react';
import type { TimelineNode as TimelineNodeType } from '../../core/types';
import { useTimelineNavigation } from '../../hooks/useTimelineNavigation';
import { BadgePill } from './BadgePill';
import { FireflySignal, type FireflyEvent } from './FireflySignal';
import { TimelineNavButtons } from './TimelineNavButtons';
import { TimelineNodeComponent } from './TimelineNode';

export interface TimelineProps {
  nodes: TimelineNodeType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pulseCommitId?: string | null;
  fireflyEvent?: FireflyEvent;
  fireflyDisabled?: boolean;
}

export function Timeline({
  nodes,
  selectedId,
  onSelect,
  pulseCommitId,
  fireflyEvent = { type: 'idle' },
  fireflyDisabled = false,
}: TimelineProps) {
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

  // Update firefly position when selectedId changes
  useEffect(() => {
    if (!selectedId) return;

    const node = nodeRefs.current.get(selectedId);
    const container = containerRef.current;
    if (!node || !container) return;

    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setFireflyPos({
      x: nodeRect.left - containerRect.left + container.scrollLeft,
      y: nodeRect.top - containerRect.top,
    });
  }, [selectedId, containerRef]);

  return (
    <div className="bg-bg-secondary border-t border-border-light px-4 py-4">
      <div className="flex items-center gap-3">
        <TimelineNavButtons
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => scrollToNode('prev')}
          onNext={() => scrollToNode('next')}
        />

        <div
          ref={containerRef}
          className="relative flex-1 overflow-x-auto no-scrollbar scroll-smooth"
          tabIndex={0}
          role="listbox"
          aria-label="Commit timeline"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scrollToNode('prev');
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              scrollToNode('next');
            }
          }}
        >
          {/* Connection line - visible path */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[18px] h-[2px]"
            style={{
              background:
                'linear-gradient(to right, var(--border-light), var(--border-medium), var(--border-light))',
              opacity: 0.95,
            }}
          />

          <div className="relative flex min-w-max items-start gap-16 px-4 py-2">
            {sorted.map((n) => (
              <TimelineNodeComponent
                key={n.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(n.id, el);
                  else nodeRefs.current.delete(n.id);
                }}
                node={n}
                selected={selectedId === n.id}
                pulsing={pulseCommitId === n.id}
                onSelect={() => onSelect(n.id)}
              />
            ))}
          </div>

          {/* Firefly Signal */}
          <FireflySignal
            x={fireflyPos.x}
            y={fireflyPos.y}
            event={fireflyEvent}
            disabled={fireflyDisabled}
          />
        </div>

        <TimelineNavButtons
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => scrollToNode('prev')}
          onNext={() => scrollToNode('next')}
        />
      </div>
    </div>
  );
}

// Re-export for convenience
export { BadgePill };
