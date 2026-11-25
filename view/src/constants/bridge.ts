export const BRIDGE_HANDLERS = {
  updateStats: 'updateStats',
  updateSettings: 'updateSettings',
  updateRuntimeStatus: 'updateRuntimeStatus',
  importSettingsFromNative: 'importSettingsFromNative',
  toggleSettings: 'toggleSettings',
  toggleWidgetsVisibility: 'toggleWidgetsVisibility',
  closeSettings: 'closeSettings',
  handleEscape: 'handleEscape',
  setHUDColor: 'setHUDColor',
  updateIconPacks: 'updateIconPacks',
  updateUserFonts: 'updateUserFonts',
} as const;

export const BRIDGE_CALLBACKS = {
  onSettingsChanged: 'onSettingsChanged',
  onSettingsSyncResult: 'onSettingsSyncResult',
  onExportSettings: 'onExportSettings',
  onImportSettings: 'onImportSettings',
  onRequestUnfocus: 'onRequestUnfocus',
  onSettingsVisibilityChanged: 'onSettingsVisibilityChanged',
  onHotkeyCapture: 'onHotkeyCapture',
  onEscapeOwner: 'onEscapeOwner',
  onExportResult: 'onExportResult',
  onImportResult: 'onImportResult',
} as const;

export const SETTINGS_PANEL_STORAGE_KEYS = {
  // Holds the settings category id now; older tab ids are ignored on read.
  activeTab: 'tulliusWidgets.settingsPanel.activeTab',
  // The collapsible-section state ('tulliusWidgets.settingsPanel.expandedSections') is no longer used.
  // The old free-floating position key ('tulliusWidgets.settingsPanel.position') is no longer read.
  dock: 'tulliusWidgets.settingsPanel.dock',
} as const;
