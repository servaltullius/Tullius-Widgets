import { BRIDGE_HANDLERS, BRIDGE_CALLBACKS } from '../constants/bridge';
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
  handleSettingsSyncResult: (success: boolean, revision?: number) => void;
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
    registerDualBridgeHandler(BRIDGE_HANDLERS.updateSettings, handlers.updateSettings),
    registerDualBridgeHandler(BRIDGE_HANDLERS.updateRuntimeStatus, handlers.updateRuntimeStatus),
    registerDualBridgeHandler(BRIDGE_HANDLERS.importSettingsFromNative, handlers.importSettingsFromNative),
    registerDualBridgeHandler(BRIDGE_HANDLERS.toggleSettings, handlers.toggleSettings),
    registerDualBridgeHandler(BRIDGE_HANDLERS.toggleWidgetsVisibility, handlers.toggleWidgetsVisibility),
    registerDualBridgeHandler(BRIDGE_HANDLERS.closeSettings, handlers.closeSettings),
    registerDualBridgeHandler(BRIDGE_HANDLERS.setHUDColor, handlers.setHUDColor),
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
      window[BRIDGE_CALLBACKS.onImportResult]?.(success);
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

    window[BRIDGE_CALLBACKS.onSettingsSyncResult] = handleSettingsSyncResult;

    return () => {
      for (const unregister of unregisterBridgeHandlers) {
        unregister();
      }

      if (window[BRIDGE_CALLBACKS.onSettingsSyncResult] === handleSettingsSyncResult) {
        delete window[BRIDGE_CALLBACKS.onSettingsSyncResult];
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
