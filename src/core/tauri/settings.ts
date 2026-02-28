import { Store } from '@tauri-apps/plugin-store';

const FIREFLY_ENABLED_KEY = 'firefly.enabled';

/**
 * Detect if running in Tauri runtime environment
 */
function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const tauriWindow = window as {
    __TAURI_INTERNALS__?: { invoke?: unknown };
    __TAURI_IPC__?: unknown;
  };
  return Boolean(tauriWindow.__TAURI_INTERNALS__?.invoke || tauriWindow.__TAURI_IPC__);
}

/**
 * Tauri Store singleton for settings persistence
 * Uses lazy initialization to avoid top-level await issues
 */
let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load('settings.json');
  }
  return store;
}

/**
 * Firefly signal settings
 */
export interface FireflySettings {
  /** Whether the firefly signal is enabled */
  enabled: boolean;
}

/**
 * Get firefly settings from persistent storage
 * Falls back to localStorage when not in Tauri environment (e.g., Playwright/browser)
 * @returns Firefly settings with defaults applied
 */
export async function getFireflySettings(): Promise<FireflySettings> {
  // Fallback to localStorage when not in Tauri (e.g., browser/Playwright)
  if (!isTauriRuntime()) {
    try {
      const stored = localStorage.getItem(FIREFLY_ENABLED_KEY);
      const enabled = stored === null ? true : stored === 'true';
      return { enabled };
    } catch (error) {
      console.error('[FireflySettings] Failed to read from localStorage:', error);
      return { enabled: true }; // Default on error
    }
  }

  try {
    const s = await getStore();
    const enabled = await s.get<boolean>(FIREFLY_ENABLED_KEY);
    return {
      enabled: enabled ?? true, // Default to enabled
    };
  } catch (error) {
    console.error('[FireflySettings] Failed to load settings:', error);
    throw error;
  }
}

/**
 * Update firefly enabled state in persistent storage
 * Falls back to localStorage when not in Tauri environment (e.g., Playwright/browser)
 * @param enabled - Whether to enable the firefly signal
 */
export async function setFireflyEnabled(enabled: boolean): Promise<void> {
  // Fallback to localStorage when not in Tauri (e.g., browser/Playwright)
  if (!isTauriRuntime()) {
    try {
      localStorage.setItem(FIREFLY_ENABLED_KEY, String(enabled));
      return;
    } catch (error) {
      console.error('[FireflySettings] Failed to write to localStorage:', error);
      throw error;
    }
  }

  try {
    const s = await getStore();
    await s.set(FIREFLY_ENABLED_KEY, enabled);
    await s.save(); // Immediate persistence
  } catch (error) {
    console.error('[FireflySettings] Failed to save settings:', error);
    throw error;
  }
}
