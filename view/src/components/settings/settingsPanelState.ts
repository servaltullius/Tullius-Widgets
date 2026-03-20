import { SETTINGS_PANEL_STORAGE_KEYS } from '../../constants/bridge';

export type PanelTab = 'general' | 'combat' | 'effects' | 'alerts' | 'presets';
export interface PanelPosition {
  left: number;
  top: number;
}

function snapPanelCoordinate(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function snapPanelPosition(position: PanelPosition): PanelPosition {
  return {
    left: snapPanelCoordinate(position.left),
    top: snapPanelCoordinate(position.top),
  };
}

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

function readLocalStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
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

export function readStoredPanelPosition(): PanelPosition | null {
  const stored = readLocalStorageItem(SETTINGS_PANEL_STORAGE_KEYS.position);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') {
      return null;
    }

    return snapPanelPosition({
      left: parsed.left,
      top: parsed.top,
    });
  } catch {
    return null;
  }
}

export function writeStoredPanelPosition(position: PanelPosition): void {
  writeLocalStorageItem(
    SETTINGS_PANEL_STORAGE_KEYS.position,
    JSON.stringify(snapPanelPosition(position)),
  );
}

export function clampStoredPanelPosition(
  position: PanelPosition,
  panelRect: Pick<DOMRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
): PanelPosition {
  const maxLeft = Math.max(0, viewportWidth - Math.max(0, panelRect.width));
  const maxTop = Math.max(0, viewportHeight - Math.max(0, panelRect.height));

  return snapPanelPosition({
    left: Math.min(Math.max(position.left, 0), maxLeft),
    top: Math.min(Math.max(position.top, 0), maxTop),
  });
}

export function centerPanelPosition(
  panelRect: Pick<DOMRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
): PanelPosition {
  return clampStoredPanelPosition(
    {
      left: (viewportWidth - Math.max(0, panelRect.width)) / 2,
      top: (viewportHeight - Math.max(0, panelRect.height)) / 2,
    },
    panelRect,
    viewportWidth,
    viewportHeight,
  );
}
