import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TimelineNavButtonsProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function TimelineNavButtons({ hasPrev, hasNext, onPrev, onNext }: TimelineNavButtonsProps) {
  return (
    <>
      <button
        type="button"
        disabled={!hasPrev}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-light bg-bg-subtle text-text-tertiary hover:bg-bg-hover hover:text-text-secondary active:bg-border-light active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-subtle disabled:hover:text-text-tertiary"
        onClick={onPrev}
        aria-label="Previous commit"
        title="Previous commit (Left Arrow)"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        disabled={!hasNext}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-light bg-bg-subtle text-text-tertiary hover:bg-bg-hover hover:text-text-secondary active:bg-border-light active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-subtle disabled:hover:text-text-tertiary"
        onClick={onNext}
        aria-label="Next commit"
        title="Next commit (Right Arrow)"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </>
  );
}
