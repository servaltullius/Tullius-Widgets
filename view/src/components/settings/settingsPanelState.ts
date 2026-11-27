import { SETTINGS_PANEL_STORAGE_KEYS } from '../../constants/bridge';
import { DEFAULT_SETTINGS_CATEGORY, SETTINGS_CATEGORY_IDS, type SettingsCategoryId } from './settingsCategories';

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

// The last category seen in this game session. Values from the older tab layout are not category
// ids and fall back to the first category.
export function readStoredSettingsCategory(): SettingsCategoryId {
  const stored = readSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab);
  return SETTINGS_CATEGORY_IDS.includes(stored as SettingsCategoryId)
    ? stored as SettingsCategoryId
    : DEFAULT_SETTINGS_CATEGORY;
}

export function writeStoredSettingsCategory(category: SettingsCategoryId): void {
  writeSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab, category);
}

export type PanelDockPreference = 'auto' | 'left' | 'right';
const PANEL_DOCK_PREFERENCES: readonly PanelDockPreference[] = ['auto', 'left', 'right'];

export function readStoredPanelDock(): PanelDockPreference {
  const stored = readLocalStorageItem(SETTINGS_PANEL_STORAGE_KEYS.dock);
  return PANEL_DOCK_PREFERENCES.includes(stored as PanelDockPreference) ? stored as PanelDockPreference : 'auto';
}

export function writeStoredPanelDock(dock: PanelDockPreference): void {
  writeLocalStorageItem(SETTINGS_PANEL_STORAGE_KEYS.dock, dock);
}

/** What the settings window keeps between openings, as stored (null: nothing stored). */
export interface SettingsPanelStorageSnapshot {
  activeTab: string | null;
  dock: string | null;
}

export function snapshotSettingsPanelStorage(): SettingsPanelStorageSnapshot {
  return {
    activeTab: readSessionStorageItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab),
    dock: readLocalStorageItem(SETTINGS_PANEL_STORAGE_KEYS.dock),
  };
}

function putStorageItem(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Ignore storage failures in constrained overlay environments.
  }
}

/** Puts back what a snapshot saw, each value in the storage that holds it. */
export function restoreSettingsPanelStorage(snapshot: SettingsPanelStorageSnapshot): void {
  putStorageItem(() => window.sessionStorage, SETTINGS_PANEL_STORAGE_KEYS.activeTab, snapshot.activeTab);
  putStorageItem(() => window.localStorage, SETTINGS_PANEL_STORAGE_KEYS.dock, snapshot.dock);
}
