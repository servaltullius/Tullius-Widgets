import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GroupPosition,
  Language,
  UpdateSettingFn,
  UpdateSettingOptions,
  WidgetLayout,
  WidgetSettings,
  WidgetSize,
} from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';
import type { RuntimeDiagnostics, RuntimeWarningCode } from '../types/runtime';
import { isPlainObject, readBoolean, readNumber, readText } from '../utils/normalize';

function readEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  if (typeof value !== 'string') return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readAccentColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (value === '') return '';
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function readRuntimeWarningCode(value: unknown): RuntimeWarningCode {
  if (value === 'none' || value === 'unsupported-runtime' || value === 'missing-address-library' || value === 'unsupported-runtime-and-missing-address-library') {
    return value;
  }
  return 'none';
}

function mergeBooleanSection<T extends Record<string, boolean>>(defaults: T, incoming: unknown): T {
  if (!isPlainObject(incoming)) return defaults;
  const source = incoming as Record<string, unknown>;
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const incomingValue = source[key as string];
    if (typeof incomingValue === 'boolean') {
      next[key] = incomingValue as T[keyof T];
    }
  }
  return next;
}

function sanitizePositions(incoming: unknown): Record<string, GroupPosition> {
  if (!isPlainObject(incoming)) return {};
  const out: Record<string, GroupPosition> = {};
  for (const [key, rawPos] of Object.entries(incoming)) {
    if (!isPlainObject(rawPos)) continue;
    const x = rawPos.x;
    const y = rawPos.y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out[key] = { x, y };
  }
  return out;
}

function sanitizeLayouts(incoming: unknown): Record<string, WidgetLayout> {
  if (!isPlainObject(incoming)) return {};
  const out: Record<string, WidgetLayout> = {};
  for (const [key, rawLayout] of Object.entries(incoming)) {
    if (rawLayout === 'vertical' || rawLayout === 'horizontal') {
      out[key] = rawLayout;
    }
  }
  return out;
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

function cloneDefaultSettings(): WidgetSettings {
  if (typeof structuredClone === 'function') {
    return structuredClone(defaultSettings);
  }
  return JSON.parse(JSON.stringify(defaultSettings)) as WidgetSettings;
}

// Deep merge with type guards: fill missing/invalid keys from defaults so bad JSON never crashes UI.
function mergeWithDefaults(saved: Record<string, unknown>): WidgetSettings {
  const merged = cloneDefaultSettings();

  const generalIncoming = saved.general;
  if (isPlainObject(generalIncoming)) {
    merged.general.visible = readBoolean(generalIncoming.visible, merged.general.visible);
    merged.general.combatOnly = readBoolean(generalIncoming.combatOnly, merged.general.combatOnly);
    merged.general.showOnChangeOnly = readBoolean(generalIncoming.showOnChangeOnly, merged.general.showOnChangeOnly);
    merged.general.changeDisplaySeconds = readNumber(generalIncoming.changeDisplaySeconds, merged.general.changeDisplaySeconds, 1, 15);
    merged.general.onboardingSeen = readBoolean(generalIncoming.onboardingSeen, merged.general.onboardingSeen);
    merged.general.opacity = readNumber(generalIncoming.opacity, merged.general.opacity, 10, 100);
    merged.general.size = readEnum<WidgetSize>(generalIncoming.size, merged.general.size, ['xsmall', 'small', 'medium', 'large']);
    merged.general.language = readEnum<Language>(generalIncoming.language, merged.general.language, ['ko', 'en']);
    merged.general.accentColor = readAccentColor(generalIncoming.accentColor, merged.general.accentColor);
    merged.general.transparentBg = readBoolean(generalIncoming.transparentBg, merged.general.transparentBg);
  }

  merged.resistances = mergeBooleanSection(merged.resistances, saved.resistances);
  merged.defense = mergeBooleanSection(merged.defense, saved.defense);
  merged.offense = mergeBooleanSection(merged.offense, saved.offense);
  merged.equipped = mergeBooleanSection(merged.equipped, saved.equipped);
  merged.movement = mergeBooleanSection(merged.movement, saved.movement);
  merged.time = mergeBooleanSection(merged.time, saved.time);
  merged.experience = mergeBooleanSection(merged.experience, saved.experience);
  merged.playerInfo = mergeBooleanSection(merged.playerInfo, saved.playerInfo);

  // Backward compatibility: migrate legacy playerInfo XP toggles to new experience widget toggle.
  if (!isPlainObject(saved.experience) && isPlainObject(saved.playerInfo)) {
    const legacyCurrent = saved.playerInfo.experience;
    const legacyToNext = saved.playerInfo.expToNextLevel;
    const hasLegacyXpToggle = typeof legacyCurrent === 'boolean' || typeof legacyToNext === 'boolean';
    if (hasLegacyXpToggle) {
      const currentEnabled = readBoolean(legacyCurrent, true);
      const toNextEnabled = readBoolean(legacyToNext, true);
      merged.experience.enabled = currentEnabled || toNextEnabled;
    }
  }

  const timedEffectsIncoming = saved.timedEffects;
  if (isPlainObject(timedEffectsIncoming)) {
    merged.timedEffects.enabled = readBoolean(timedEffectsIncoming.enabled, merged.timedEffects.enabled);
    merged.timedEffects.maxVisible = readNumber(timedEffectsIncoming.maxVisible, merged.timedEffects.maxVisible, 1, 12);
  }

  const alertsIncoming = saved.visualAlerts;
  if (isPlainObject(alertsIncoming)) {
    merged.visualAlerts.enabled = readBoolean(alertsIncoming.enabled, merged.visualAlerts.enabled);
    merged.visualAlerts.lowHealth = readBoolean(alertsIncoming.lowHealth, merged.visualAlerts.lowHealth);
    merged.visualAlerts.lowHealthThreshold = readNumber(
      alertsIncoming.lowHealthThreshold,
      merged.visualAlerts.lowHealthThreshold,
      10,
      60
    );
    merged.visualAlerts.lowStamina = readBoolean(alertsIncoming.lowStamina, merged.visualAlerts.lowStamina);
    merged.visualAlerts.lowStaminaThreshold = readNumber(
      alertsIncoming.lowStaminaThreshold,
      merged.visualAlerts.lowStaminaThreshold,
      10,
      60
    );
    merged.visualAlerts.lowMagicka = readBoolean(alertsIncoming.lowMagicka, merged.visualAlerts.lowMagicka);
    merged.visualAlerts.lowMagickaThreshold = readNumber(
      alertsIncoming.lowMagickaThreshold,
      merged.visualAlerts.lowMagickaThreshold,
      10,
      60
    );
    merged.visualAlerts.overencumbered = readBoolean(alertsIncoming.overencumbered, merged.visualAlerts.overencumbered);
  }

  merged.positions = sanitizePositions(saved.positions);
  merged.layouts = sanitizeLayouts(saved.layouts);
  return merged;
}

function updateValueByPath(current: WidgetSettings, path: string, value: unknown): WidgetSettings {
  const keys = path.split('.');
  if (keys.length === 0) return current;

  const parentChain: Array<{ parent: Record<string, unknown>; key: string }> = [];
  let cursor: unknown = current as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isPlainObject(cursor)) return current;
    const parent = cursor as Record<string, unknown>;
    const key = keys[i];
    const next = parent[key];
    if (!isPlainObject(next)) return current;
    parentChain.push({ parent, key });
    cursor = next;
  }

  if (!isPlainObject(cursor)) return current;

  const leafParent = cursor as Record<string, unknown>;
  const leafKey = keys[keys.length - 1];
  if (Object.is(leafParent[leafKey], value)) return current;

  let updatedNode: Record<string, unknown> = {
    ...leafParent,
    [leafKey]: value,
  };
  for (let i = parentChain.length - 1; i >= 0; i--) {
    const { parent, key } = parentChain[i];
    updatedNode = {
      ...parent,
      [key]: updatedNode,
    };
  }

  return updatedNode as unknown as WidgetSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudColor, setHudColor] = useState('#ffffff');
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  const [sessionVisibleOverride, setSessionVisibleOverride] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueuedSettingsJsonRef = useRef('');
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const notifySettingsChanged = useCallback((json: string) => {
    if (json === lastQueuedSettingsJsonRef.current) {
      return;
    }
    lastQueuedSettingsJsonRef.current = json;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      window.onSettingsChanged?.(json);
    }, 200);
  }, []);

  const applyIncomingSettings = useCallback((jsonString: string, persist: boolean): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!isPlainObject(parsed)) {
        console.error('Failed to apply settings: payload is not an object');
        return false;
      }
      const merged = mergeWithDefaults(parsed);
      const mergedJson = JSON.stringify(merged);
      setSettings(merged);
      setSessionVisibleOverride(null);
      if (persist) {
        notifySettingsChanged(mergedJson);
      } else {
        lastQueuedSettingsJsonRef.current = mergedJson;
      }
      return true;
    } catch (e) {
      console.error('Failed to parse settings JSON:', e);
      return false;
    }
  }, [notifySettingsChanged]);

  useEffect(() => {
    let bridgeNamespace = window.TulliusWidgetsBridge;
    if (!bridgeNamespace) {
      bridgeNamespace = {};
      window.TulliusWidgetsBridge = bridgeNamespace;
    }

    let bridgeV1 = bridgeNamespace.v1;
    if (!bridgeV1) {
      bridgeV1 = {};
      bridgeNamespace.v1 = bridgeV1;
    }

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

    const toggleSettingsHandler = () => {
      setSettingsOpen(prev => !prev);
    };

    const toggleWidgetsVisibilityHandler = () => {
      setSessionVisibleOverride(prev =>
        prev === null ? !settingsRef.current.general.visible : !prev
      );
    };

    const closeSettingsHandler = () => {
      setSettingsOpen(false);
    };

    const setHUDColorHandler = (hex: string) => {
      setHudColor(hex);
    };

    bridgeV1.updateSettings = updateSettingsHandler;
    bridgeV1.updateRuntimeStatus = updateRuntimeStatusHandler;
    bridgeV1.importSettingsFromNative = importSettingsFromNativeHandler;
    bridgeV1.toggleSettings = toggleSettingsHandler;
    bridgeV1.toggleWidgetsVisibility = toggleWidgetsVisibilityHandler;
    bridgeV1.closeSettings = closeSettingsHandler;
    bridgeV1.setHUDColor = setHUDColorHandler;
    window.updateSettings = updateSettingsHandler;
    window.updateRuntimeStatus = updateRuntimeStatusHandler;
    window.importSettingsFromNative = importSettingsFromNativeHandler;
    window.toggleSettings = toggleSettingsHandler;
    window.toggleWidgetsVisibility = toggleWidgetsVisibilityHandler;
    window.closeSettings = closeSettingsHandler;
    window.setHUDColor = setHUDColorHandler;

    return () => {
      if (window.updateSettings === updateSettingsHandler) delete window.updateSettings;
      if (window.updateRuntimeStatus === updateRuntimeStatusHandler) delete window.updateRuntimeStatus;
      if (window.importSettingsFromNative === importSettingsFromNativeHandler) delete window.importSettingsFromNative;
      if (window.toggleSettings === toggleSettingsHandler) delete window.toggleSettings;
      if (window.toggleWidgetsVisibility === toggleWidgetsVisibilityHandler) delete window.toggleWidgetsVisibility;
      if (window.closeSettings === closeSettingsHandler) delete window.closeSettings;
      if (window.setHUDColor === setHUDColorHandler) delete window.setHUDColor;

      if (window.TulliusWidgetsBridge?.v1?.updateSettings === updateSettingsHandler) delete window.TulliusWidgetsBridge.v1.updateSettings;
      if (window.TulliusWidgetsBridge?.v1?.updateRuntimeStatus === updateRuntimeStatusHandler) delete window.TulliusWidgetsBridge.v1.updateRuntimeStatus;
      if (window.TulliusWidgetsBridge?.v1?.importSettingsFromNative === importSettingsFromNativeHandler) delete window.TulliusWidgetsBridge.v1.importSettingsFromNative;
      if (window.TulliusWidgetsBridge?.v1?.toggleSettings === toggleSettingsHandler) delete window.TulliusWidgetsBridge.v1.toggleSettings;
      if (window.TulliusWidgetsBridge?.v1?.toggleWidgetsVisibility === toggleWidgetsVisibilityHandler) delete window.TulliusWidgetsBridge.v1.toggleWidgetsVisibility;
      if (window.TulliusWidgetsBridge?.v1?.closeSettings === closeSettingsHandler) delete window.TulliusWidgetsBridge.v1.closeSettings;
      if (window.TulliusWidgetsBridge?.v1?.setHUDColor === setHUDColorHandler) delete window.TulliusWidgetsBridge.v1.setHUDColor;
      if (window.TulliusWidgetsBridge?.v1 && Object.keys(window.TulliusWidgetsBridge.v1).length === 0) {
        delete window.TulliusWidgetsBridge.v1;
      }
      if (window.TulliusWidgetsBridge && Object.keys(window.TulliusWidgetsBridge).length === 0) {
        delete window.TulliusWidgetsBridge;
      }

      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applyIncomingSettings]);

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

  const updateSetting = useCallback<UpdateSettingFn>((path: string, value: unknown, options?: UpdateSettingOptions) => {
    setSettings(prev => {
      const next = updateValueByPath(prev, path, value);
      if (next === prev) {
        return prev;
      }

      if (path === 'general.visible') {
        setSessionVisibleOverride(null);
      }

      if (options?.persist !== false) {
        notifySettingsChanged(JSON.stringify(next));
      }

      return next;
    });
  }, [notifySettingsChanged]);

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
  };
}
