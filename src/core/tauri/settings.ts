import { Store } from '@tauri-apps/plugin-store';

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
 * @returns Firefly settings with defaults applied
 */
export async function getFireflySettings(): Promise<FireflySettings> {
  try {
    const s = await getStore();
    const enabled = await s.get<boolean>('firefly.enabled');
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
 * @param enabled - Whether to enable the firefly signal
 */
export async function setFireflyEnabled(enabled: boolean): Promise<void> {
  try {
    const s = await getStore();
    await s.set('firefly.enabled', enabled);
    await s.save(); // Immediate persistence
  } catch (error) {
    console.error('[FireflySettings] Failed to save settings:', error);
    throw error;
  }
}
