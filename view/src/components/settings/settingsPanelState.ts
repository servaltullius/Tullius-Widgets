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
