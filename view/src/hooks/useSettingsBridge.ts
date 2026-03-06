import { useEffect } from 'react';
import type { RuntimeDiagnostics, RuntimeWarningCode } from '../types/runtime';
import { isPlainObject, readBoolean, readText } from '../utils/normalize';
import { registerDualBridgeHandler } from '../utils/bridge';

interface SettingsBridgeHandlers {
  updateSettings: NonNullable<TulliusWidgetsBridgeV1['updateSettings']>;
  updateRuntimeStatus: NonNullable<TulliusWidgetsBridgeV1['updateRuntimeStatus']>;
  importSettingsFromNative: NonNullable<TulliusWidgetsBridgeV1['importSettingsFromNative']>;
  toggleSettings: NonNullable<TulliusWidgetsBridgeV1['toggleSettings']>;
  toggleWidgetsVisibility: NonNullable<TulliusWidgetsBridgeV1['toggleWidgetsVisibility']>;
  closeSettings: NonNullable<TulliusWidgetsBridgeV1['closeSettings']>;
  setHUDColor: NonNullable<TulliusWidgetsBridgeV1['setHUDColor']>;
}

interface UseSettingsBridgeParams {
  applyIncomingSettings: (jsonString: string, persist: boolean) => boolean;
  setRuntimeDiagnostics: (value: RuntimeDiagnostics | null) => void;
  toggleSettings: () => void;
  toggleWidgetsVisibility: () => void;
  closeSettings: () => void;
  setHUDColor: (hex: string) => void;
  handleSettingsSyncResult: (success: boolean) => void;
}

function readRuntimeWarningCode(value: unknown): RuntimeWarningCode {
  if (value === 'none' || value === 'unsupported-runtime' || value === 'missing-address-library' || value === 'unsupported-runtime-and-missing-address-library') {
    return value;
  }
  return 'none';
}

function normalizeRuntimeDiagnostics(value: unknown): RuntimeDiagnostics | null {
  if (!isPlainObject(value)) return null;

  return {
    runtimeVersion: readText(value.runtimeVersion, ''),
    skseVersion: readText(value.skseVersion, ''),
    addressLibraryPath: readText(value.addressLibraryPath, ''),
    addressLibraryPresent: readBoolean(value.addressLibraryPresent, true),
    runtimeSupported: readBoolean(value.runtimeSupported, true),
    usesAddressLibrary: readBoolean(value.usesAddressLibrary, true),
    warningCode: readRuntimeWarningCode(value.warningCode),
  };
}

function registerSettingsBridgeHandlers(handlers: SettingsBridgeHandlers): Array<() => void> {
  return [
    registerDualBridgeHandler('updateSettings', handlers.updateSettings),
    registerDualBridgeHandler('updateRuntimeStatus', handlers.updateRuntimeStatus),
    registerDualBridgeHandler('importSettingsFromNative', handlers.importSettingsFromNative),
    registerDualBridgeHandler('toggleSettings', handlers.toggleSettings),
    registerDualBridgeHandler('toggleWidgetsVisibility', handlers.toggleWidgetsVisibility),
    registerDualBridgeHandler('closeSettings', handlers.closeSettings),
    registerDualBridgeHandler('setHUDColor', handlers.setHUDColor),
  ];
}

export function useSettingsBridge({
  applyIncomingSettings,
  setRuntimeDiagnostics,
  toggleSettings,
  toggleWidgetsVisibility,
  closeSettings,
  setHUDColor,
  handleSettingsSyncResult,
}: UseSettingsBridgeParams) {
  useEffect(() => {
    const updateSettingsHandler = (jsonString: string) => {
      applyIncomingSettings(jsonString, false);
    };

    const updateRuntimeStatusHandler = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as unknown;
        setRuntimeDiagnostics(normalizeRuntimeDiagnostics(parsed));
      } catch (e) {
        console.error('Failed to parse runtime diagnostics JSON:', e);
      }
    };

    const importSettingsFromNativeHandler = (jsonString: string) => {
      const success = applyIncomingSettings(jsonString, true);
      window.onImportResult?.(success);
    };

    const unregisterBridgeHandlers = registerSettingsBridgeHandlers({
      updateSettings: updateSettingsHandler,
      updateRuntimeStatus: updateRuntimeStatusHandler,
      importSettingsFromNative: importSettingsFromNativeHandler,
      toggleSettings,
      toggleWidgetsVisibility,
      closeSettings,
      setHUDColor,
    });

    window.onSettingsSyncResult = handleSettingsSyncResult;

    return () => {
      for (const unregister of unregisterBridgeHandlers) {
        unregister();
      }

      if (window.onSettingsSyncResult === handleSettingsSyncResult) {
        delete window.onSettingsSyncResult;
      }
    };
  }, [
    applyIncomingSettings,
    closeSettings,
    handleSettingsSyncResult,
    setHUDColor,
    setRuntimeDiagnostics,
    toggleSettings,
    toggleWidgetsVisibility,
  ]);
}
