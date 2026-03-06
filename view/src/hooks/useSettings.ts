import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
import type { RuntimeDiagnostics } from '../types/runtime';
import { isPlainObject, readBoolean, readNumber } from '../utils/normalize';
import { readRevision, SETTINGS_SCHEMA_VERSION, updateValueByPath } from './settingsShared';
import { useSettingsBridge } from './useSettingsBridge';
import { useSettingsSync } from './useSettingsSync';

function readEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  if (typeof value !== 'string') return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readAccentColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (value === '') return '';
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
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

function cloneDefaultSettings(): WidgetSettings {
  if (typeof structuredClone === 'function') {
    return structuredClone(defaultSettings);
  }
  return JSON.parse(JSON.stringify(defaultSettings)) as WidgetSettings;
}

function mergeGeneralSettings(target: WidgetSettings['general'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.visible = readBoolean(incoming.visible, target.visible);
  target.combatOnly = readBoolean(incoming.combatOnly, target.combatOnly);
  target.showOnChangeOnly = readBoolean(incoming.showOnChangeOnly, target.showOnChangeOnly);
  target.changeDisplaySeconds = readNumber(incoming.changeDisplaySeconds, target.changeDisplaySeconds, 1, 15);
  target.onboardingSeen = readBoolean(incoming.onboardingSeen, target.onboardingSeen);
  target.opacity = readNumber(incoming.opacity, target.opacity, 10, 100);
  target.size = readEnum<WidgetSize>(incoming.size, target.size, ['xsmall', 'small', 'medium', 'large']);
  target.language = readEnum<Language>(incoming.language, target.language, ['ko', 'en']);
  target.accentColor = readAccentColor(incoming.accentColor, target.accentColor);
  target.transparentBg = readBoolean(incoming.transparentBg, target.transparentBg);
}

function migrateLegacyExperienceToggle(
  experience: WidgetSettings['experience'],
  experienceIncoming: unknown,
  playerInfoIncoming: unknown,
): void {
  if (isPlainObject(experienceIncoming) || !isPlainObject(playerInfoIncoming)) {
    return;
  }

  const legacyCurrent = playerInfoIncoming.experience;
  const legacyToNext = playerInfoIncoming.expToNextLevel;
  const hasLegacyXpToggle = typeof legacyCurrent === 'boolean' || typeof legacyToNext === 'boolean';
  if (!hasLegacyXpToggle) {
    return;
  }

  const currentEnabled = readBoolean(legacyCurrent, true);
  const toNextEnabled = readBoolean(legacyToNext, true);
  experience.enabled = currentEnabled || toNextEnabled;
}

function mergeTimedEffectsSettings(target: WidgetSettings['timedEffects'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.enabled = readBoolean(incoming.enabled, target.enabled);
  target.maxVisible = readNumber(incoming.maxVisible, target.maxVisible, 1, 12);
}

function mergeVisualAlertsSettings(target: WidgetSettings['visualAlerts'], incoming: unknown): void {
  if (!isPlainObject(incoming)) {
    return;
  }

  target.enabled = readBoolean(incoming.enabled, target.enabled);
  target.lowHealth = readBoolean(incoming.lowHealth, target.lowHealth);
  target.lowHealthThreshold = readNumber(incoming.lowHealthThreshold, target.lowHealthThreshold, 10, 60);
  target.lowStamina = readBoolean(incoming.lowStamina, target.lowStamina);
  target.lowStaminaThreshold = readNumber(incoming.lowStaminaThreshold, target.lowStaminaThreshold, 10, 60);
  target.lowMagicka = readBoolean(incoming.lowMagicka, target.lowMagicka);
  target.lowMagickaThreshold = readNumber(incoming.lowMagickaThreshold, target.lowMagickaThreshold, 10, 60);
  target.overencumbered = readBoolean(incoming.overencumbered, target.overencumbered);
}

// Deep merge with type guards: fill missing/invalid keys from defaults so bad JSON never crashes UI.
function mergeWithDefaults(saved: Record<string, unknown>): WidgetSettings {
  const merged = cloneDefaultSettings();

  mergeGeneralSettings(merged.general, saved.general);

  merged.resistances = mergeBooleanSection(merged.resistances, saved.resistances);
  merged.defense = mergeBooleanSection(merged.defense, saved.defense);
  merged.offense = mergeBooleanSection(merged.offense, saved.offense);
  merged.equipped = mergeBooleanSection(merged.equipped, saved.equipped);
  merged.movement = mergeBooleanSection(merged.movement, saved.movement);
  merged.time = mergeBooleanSection(merged.time, saved.time);
  merged.experience = mergeBooleanSection(merged.experience, saved.experience);
  merged.playerInfo = mergeBooleanSection(merged.playerInfo, saved.playerInfo);

  migrateLegacyExperienceToggle(merged.experience, saved.experience, saved.playerInfo);
  mergeTimedEffectsSettings(merged.timedEffects, saved.timedEffects);
  mergeVisualAlertsSettings(merged.visualAlerts, saved.visualAlerts);

  merged.positions = sanitizePositions(saved.positions);
  merged.layouts = sanitizeLayouts(saved.layouts);
  return merged;
}

function warnFutureSettingsSchemaVersion(
  parsed: Record<string, unknown>,
  warnedFutureSettingsSchemaRef: { current: boolean },
): void {
  const schemaVersion = readRevision(parsed.schemaVersion);
  if (
    schemaVersion === null
    || schemaVersion <= SETTINGS_SCHEMA_VERSION
    || warnedFutureSettingsSchemaRef.current
  ) {
    return;
  }

  warnedFutureSettingsSchemaRef.current = true;
  console.warn(
    `[TulliusWidgets] Received settings schemaVersion ${schemaVersion}, but UI supports up to ${SETTINGS_SCHEMA_VERSION}. Falling back to tolerant parsing.`,
  );
}

function acceptIncomingSettingsRevision(
  parsed: Record<string, unknown>,
  lastAppliedSettingsRevisionRef: { current: number | null },
  settingsRevisionRef: { current: number },
): boolean {
  const incomingRevision = readRevision(parsed.rev);
  if (incomingRevision === null) {
    return true;
  }

  const lastAppliedRevision = lastAppliedSettingsRevisionRef.current;
  if (lastAppliedRevision !== null && incomingRevision < lastAppliedRevision) {
    return false;
  }

  lastAppliedSettingsRevisionRef.current = incomingRevision;
  settingsRevisionRef.current = Math.max(settingsRevisionRef.current, incomingRevision);
  return true;
}

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
  };
}
