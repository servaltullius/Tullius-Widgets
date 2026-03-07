export const BRIDGE_HANDLERS = {
  updateStats: 'updateStats',
  updateSettings: 'updateSettings',
  updateRuntimeStatus: 'updateRuntimeStatus',
  importSettingsFromNative: 'importSettingsFromNative',
  toggleSettings: 'toggleSettings',
  toggleWidgetsVisibility: 'toggleWidgetsVisibility',
  closeSettings: 'closeSettings',
  setHUDColor: 'setHUDColor',
} as const;

export const BRIDGE_CALLBACKS = {
  onSettingsChanged: 'onSettingsChanged',
  onSettingsSyncResult: 'onSettingsSyncResult',
  onExportSettings: 'onExportSettings',
  onImportSettings: 'onImportSettings',
  onRequestUnfocus: 'onRequestUnfocus',
  onSettingsVisibilityChanged: 'onSettingsVisibilityChanged',
  onExportResult: 'onExportResult',
  onImportResult: 'onImportResult',
} as const;

export const SETTINGS_PANEL_STORAGE_KEYS = {
  activeTab: 'tulliusWidgets.settingsPanel.activeTab',
  expandedSections: 'tulliusWidgets.settingsPanel.expandedSections',
} as const;
