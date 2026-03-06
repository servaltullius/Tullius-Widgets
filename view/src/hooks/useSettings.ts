import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type {
  UpdateSettingFn,
  UpdateSettingOptions,
  WidgetSettings,
} from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';
import type { RuntimeDiagnostics } from '../types/runtime';
import { isPlainObject } from '../utils/normalize';
import { updateValueByPath } from './settingsShared';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';
import { useSettingsBridge } from './useSettingsBridge';
import { useSettingsSync } from './useSettingsSync';

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudColor, setHudColor] = useState('#ffffff');
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  // useReducer instead of useState to guarantee state update even when the
  // computed value is the same as the previous one (Object.is skip issue).
  type VisibleAction = { type: 'toggle'; settingsVisible: boolean } | { type: 'reset' };
  const [sessionVisibleOverride, dispatchVisibleOverride] = useReducer(
    (prev: boolean | null, action: VisibleAction): boolean | null => {
      if (action.type === 'reset') return null;
      return prev === null ? !action.settingsVisible : !prev;
    },
    null,
  );
  const settingsRevisionRef = useRef(0);
  const lastAppliedSettingsRevisionRef = useRef<number | null>(null);
  const warnedFutureSettingsSchemaRef = useRef(false);
  const settingsRef = useRef(settings);
  const {
    lastSettingsSyncOk,
    settingsSyncState,
    notifySettingsChanged,
    rememberQueuedSettings,
    handleSettingsSyncResult,
    retryPersistedSettings,
  } = useSettingsSync({ settingsRevisionRef });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const applyIncomingSettings = useCallback((jsonString: string, persist: boolean): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!isPlainObject(parsed)) {
        console.error('Failed to apply settings: payload is not an object');
        return false;
      }

      warnFutureSettingsSchemaVersion(parsed, warnedFutureSettingsSchemaRef);
      if (!acceptIncomingSettingsRevision(parsed, lastAppliedSettingsRevisionRef, settingsRevisionRef)) {
        return true;
      }

      const merged = mergeWithDefaults(parsed);
      setSettings(merged);
      dispatchVisibleOverride({ type: 'reset' });

      if (persist) {
        notifySettingsChanged(merged);
      } else {
        rememberQueuedSettings(merged, settingsRevisionRef.current);
      }
      return true;
    } catch (e) {
      console.error('Failed to parse settings JSON:', e);
      return false;
    }
  }, [notifySettingsChanged, rememberQueuedSettings]);

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev);
  }, []);

  const toggleWidgetsVisibility = useCallback(() => {
    dispatchVisibleOverride({ type: 'toggle', settingsVisible: settingsRef.current.general.visible });
  }, []);

  const closeSettingsFromBridge = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const setHUDColor = useCallback((hex: string) => {
    setHudColor(hex);
  }, []);

  useSettingsBridge({
    applyIncomingSettings,
    setRuntimeDiagnostics,
    toggleSettings,
    toggleWidgetsVisibility,
    closeSettings: closeSettingsFromBridge,
    setHUDColor,
    handleSettingsSyncResult,
  });

  // ESC key closes settings and requests unfocus.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
        window.onRequestUnfocus?.('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    window.onSettingsVisibilityChanged?.(settingsOpen ? 'open' : 'closed');
  }, [settingsOpen]);

  const updateSetting = useCallback<UpdateSettingFn>((path: string, value: unknown, options?: UpdateSettingOptions) => {
    if (options?.persist !== false) {
      const currentSettings = settingsRef.current;
      if (updateValueByPath(currentSettings, path, value) === currentSettings && retryPersistedSettings(currentSettings)) {
        return;
      }
    }

    setSettings(prev => {
      const next = updateValueByPath(prev, path, value);
      if (next === prev) {
        return prev;
      }

      if (path === 'general.visible') {
        dispatchVisibleOverride({ type: 'reset' });
      }

      if (options?.persist !== false) {
        notifySettingsChanged(next);
      }

      return next;
    });
  }, [notifySettingsChanged, retryPersistedSettings]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    window.onRequestUnfocus?.('');
  }, []);

  // Resolved accent color: manual override > auto HUD color.
  const accentColor = settings.general.accentColor || hudColor;
  const visible = sessionVisibleOverride === null
    ? settings.general.visible
    : sessionVisibleOverride;

  return {
    settings,
    visible,
    settingsOpen,
    setSettingsOpen,
    closeSettings,
    updateSetting,
    accentColor,
    hudColor,
    runtimeDiagnostics,
    lastSettingsSyncOk,
    settingsSyncState,
  };
}
