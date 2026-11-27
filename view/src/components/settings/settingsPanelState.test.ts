// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { SETTINGS_PANEL_STORAGE_KEYS } from '../../constants/bridge';
import {
  restoreSettingsPanelStorage,
  snapshotSettingsPanelStorage,
  writeStoredPanelDock,
  writeStoredSettingsCategory,
} from './settingsPanelState';

describe('settings window storage snapshot', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('puts each value back in the storage that holds it', () => {
    writeStoredSettingsCategory('effects');
    writeStoredPanelDock('left');
    const snapshot = snapshotSettingsPanelStorage();
    expect(snapshot).toEqual({ activeTab: 'effects', dock: 'left' });

    writeStoredSettingsCategory('display');
    writeStoredPanelDock('right');
    restoreSettingsPanelStorage(snapshot);

    expect(window.sessionStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab)).toBe('effects');
    expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.dock)).toBe('left');
    // Nothing lands in the other storage.
    expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab)).toBeNull();
    expect(window.sessionStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.dock)).toBeNull();
  });

  it('removes what was not stored before', () => {
    const snapshot = snapshotSettingsPanelStorage();
    expect(snapshot).toEqual({ activeTab: null, dock: null });

    writeStoredSettingsCategory('combat');
    writeStoredPanelDock('right');
    restoreSettingsPanelStorage(snapshot);

    expect(window.sessionStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.activeTab)).toBeNull();
    expect(window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEYS.dock)).toBeNull();
  });
});
