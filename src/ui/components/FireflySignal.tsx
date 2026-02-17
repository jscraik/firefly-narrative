import { useEffect, useState } from 'react';

/**
 * Firefly event types
 * - idle: Default breathing state
 * - active: Pulse animation for events
 */
export type FireflyEvent =
  | { type: 'idle' }
  | { type: 'active'; message?: string };

export interface FireflySignalProps {
  /** X position relative to container */
  x: number;
  /** Y position relative to container */
  y: number;
  /** Current event state */
  event?: FireflyEvent;
  /** Whether the firefly is disabled (hidden) */
  disabled?: boolean;
}

/**
 * Firefly Signal Component
 *
 * An ambient UI instrument that provides persistent, non-intrusive feedback
 * about system state. Renders as a glowing orb that breathes in idle state
 * and pulses when active.
 *
 * @example
 * <FireflySignal x={100} y={20} event={{ type: 'idle' }} />
 */
export function FireflySignal({
  x,
  y,
  event = { type: 'idle' },
  disabled = false,
}: FireflySignalProps) {
  const [isVisible, setIsVisible] = useState(!disabled);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync visibility with disabled prop
  useEffect(() => {
    setIsVisible(!disabled);
  }, [disabled]);

  // Handle active state animation
  useEffect(() => {
    if (event.type === 'active') {
      setIsAnimating(true);
    }
  }, [event]);

  if (!isVisible) return null;

  return (
    <div
      className={[
        'firefly',
        event.type === 'idle' ? 'animate-breathe' : '',
        event.type === 'active' ? 'animate-pulse-ring firefly-tracking' : '',
      ].filter(Boolean).join(' ')}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
      aria-hidden="true"
      onAnimationEnd={() => setIsAnimating(false)}
      data-state={event.type}
      data-animating={isAnimating}
    />
  );
}
