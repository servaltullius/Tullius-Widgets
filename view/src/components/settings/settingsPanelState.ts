import { SETTINGS_PANEL_STORAGE_KEYS } from '../../constants/bridge';

export type PanelTab = 'general' | 'combat' | 'effects' | 'alerts' | 'presets';

function readSessionStorageItem(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorageItem(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in constrained overlay environments.
  }
}

export function readStoredPanelTab(fallback: PanelTab, allowedTabs: readonly PanelTab[]): PanelTab {
  const stored = readSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab);
  if (!stored) {
    return fallback;
  }

  return allowedTabs.includes(stored as PanelTab)
    ? (stored as PanelTab)
    : fallback;
}

export function writeStoredPanelTab(tab: PanelTab): void {
  writeSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab, tab);
}

export function readStoredExpandedSections(
  defaults: Record<string, boolean>,
): Record<string, boolean> {
  const stored = readSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.expandedSections);
  if (!stored) {
    return { ...defaults };
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const next = { ...defaults };
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') {
        next[key] = value;
      }
    }
    return next;
  } catch {
    return { ...defaults };
  }
}

export function writeStoredExpandedSections(expandedSections: Record<string, boolean>): void {
  writeSessionStorageItem(
    SETTINGS_PANEL_STORAGE_KEYS.expandedSections,
    JSON.stringify(expandedSections),
  );
}
