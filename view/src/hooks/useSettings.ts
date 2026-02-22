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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  let out = value;
  if (typeof min === 'number') out = Math.max(min, out);
  if (typeof max === 'number') out = Math.min(max, out);
  return out;
}

function readEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  if (typeof value !== 'string') return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readAccentColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (value === '') return '';
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
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

// Deep merge with type guards: fill missing/invalid keys from defaults so bad JSON never crashes UI.
function mergeWithDefaults(saved: Record<string, unknown>): WidgetSettings {
  const merged = structuredClone(defaultSettings);

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

function setValueByPath(target: WidgetSettings, path: string, value: unknown): void {
  const keys = path.split('.');
  if (keys.length === 0) return;

  let cursor: Record<string, unknown> = target as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cursor[keys[i]];
    if (!isPlainObject(next)) return;
    cursor = next;
  }

  cursor[keys[keys.length - 1]] = value;
}

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudColor, setHudColor] = useState('#ffffff');
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  const [sessionVisibleOverride, setSessionVisibleOverride] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const notifySettingsChanged = useCallback((json: string) => {
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
      setSettings(merged);
      setSessionVisibleOverride(null);
      if (persist) {
        notifySettingsChanged(JSON.stringify(merged));
      }
      return true;
    } catch (e) {
      console.error('Failed to parse settings JSON:', e);
      return false;
    }
  }, [notifySettingsChanged]);

  useEffect(() => {
    window.updateSettings = (jsonString: string) => {
      applyIncomingSettings(jsonString, false);
    };

    window.updateRuntimeStatus = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as unknown;
        setRuntimeDiagnostics(normalizeRuntimeDiagnostics(parsed));
      } catch (e) {
        console.error('Failed to parse runtime diagnostics JSON:', e);
      }
    };

    window.importSettingsFromNative = (jsonString: string) => {
      const success = applyIncomingSettings(jsonString, true);
      window.onImportResult?.(success);
    };

    window.toggleSettings = () => {
      setSettingsOpen(prev => !prev);
    };

    window.toggleWidgetsVisibility = () => {
      setSessionVisibleOverride(prev =>
        prev === null ? !settingsRef.current.general.visible : !prev
      );
    };

    window.closeSettings = () => {
      setSettingsOpen(false);
    };

    window.setHUDColor = (hex: string) => {
      setHudColor(hex);
    };

    return () => {
      delete window.updateSettings;
      delete window.updateRuntimeStatus;
      delete window.importSettingsFromNative;
      delete window.toggleSettings;
      delete window.toggleWidgetsVisibility;
      delete window.closeSettings;
      delete window.setHUDColor;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applyIncomingSettings, notifySettingsChanged]);

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
      const next = structuredClone(prev);
      setValueByPath(next, path, value);

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
  const visible = sessionVisibleOverride ?? settings.general.visible;

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
