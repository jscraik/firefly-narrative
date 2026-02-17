import { useCallback, useEffect, useState } from 'react';
import { getFireflySettings, setFireflyEnabled } from '../core/tauri/settings';
import type { FireflyEvent } from '../ui/components/FireflySignal';

export interface UseFireflyReturn {
  /** Whether firefly is enabled (from settings) */
  enabled: boolean;
  /** Loading state while fetching settings */
  loading: boolean;
  /** Toggle firefly enabled state */
  toggle: () => Promise<void>;
  /** Current firefly event state */
  event: FireflyEvent;
  /** Set firefly event state */
  setEvent: (event: FireflyEvent) => void;
  /** Trigger a pulse animation */
  pulse: (message?: string) => void;
}

/**
 * Hook to manage Firefly Signal state and settings
 * 
 * Handles:
 * - Loading/saving enabled state from Tauri Store
 * - Managing firefly event state (idle, active, etc.)
 * - Providing pulse trigger for animations
 */
export function useFirefly(): UseFireflyReturn {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<FireflyEvent>({ type: 'idle' });

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const settings = await getFireflySettings();
        if (!cancelled) {
          setEnabled(settings.enabled);
        }
      } catch (error) {
        console.error('[useFirefly] Failed to load settings:', error);
        // Keep default (enabled) on error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  // Toggle enabled state
  const toggle = useCallback(async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    try {
      await setFireflyEnabled(newEnabled);
    } catch (error) {
      console.error('[useFirefly] Failed to save settings:', error);
      // Revert on error
      setEnabled(enabled);
    }
  }, [enabled]);

  // Trigger pulse animation
  const pulse = useCallback((message?: string) => {
    setEvent({ type: 'active', message });
    // Auto-return to idle after animation
    setTimeout(() => {
      setEvent({ type: 'idle' });
    }, 500);
  }, []);

  return {
    enabled,
    loading,
    toggle,
    event,
    setEvent,
    pulse,
  };
}
