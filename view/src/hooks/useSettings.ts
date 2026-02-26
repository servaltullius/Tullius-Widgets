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
import { registerDualBridgeHandler } from '../utils/bridge';

const SETTINGS_SCHEMA_VERSION = 1;

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

function readRevision(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const revision = Math.trunc(value);
  if (revision < 0) return null;
  return revision;
}

function serializeSettingsPayload(settings: WidgetSettings, revision: number): string {
  return JSON.stringify({
    ...settings,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    rev: revision,
  });
}

interface SettingsBridgeHandlers {
  updateSettings: NonNullable<TulliusWidgetsBridgeV1['updateSettings']>;
  updateRuntimeStatus: NonNullable<TulliusWidgetsBridgeV1['updateRuntimeStatus']>;
  importSettingsFromNative: NonNullable<TulliusWidgetsBridgeV1['importSettingsFromNative']>;
  toggleSettings: NonNullable<TulliusWidgetsBridgeV1['toggleSettings']>;
  toggleWidgetsVisibility: NonNullable<TulliusWidgetsBridgeV1['toggleWidgetsVisibility']>;
  closeSettings: NonNullable<TulliusWidgetsBridgeV1['closeSettings']>;
  setHUDColor: NonNullable<TulliusWidgetsBridgeV1['setHUDColor']>;
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
  const [lastSettingsSyncOk, setLastSettingsSyncOk] = useState<boolean | null>(null);
  const [sessionVisibleOverride, setSessionVisibleOverride] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueuedSettingsJsonRef = useRef('');
  const settingsRevisionRef = useRef(0);
  const lastAppliedSettingsRevisionRef = useRef<number | null>(null);
  const warnedFutureSettingsSchemaRef = useRef(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const notifySettingsChanged = useCallback((nextSettings: WidgetSettings, explicitRevision?: number) => {
    const nextRevision = explicitRevision !== undefined
      ? explicitRevision
      : settingsRevisionRef.current + 1;
    settingsRevisionRef.current = Math.max(settingsRevisionRef.current, nextRevision);

    const json = serializeSettingsPayload(nextSettings, settingsRevisionRef.current);

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

      warnFutureSettingsSchemaVersion(parsed, warnedFutureSettingsSchemaRef);
      if (!acceptIncomingSettingsRevision(parsed, lastAppliedSettingsRevisionRef, settingsRevisionRef)) {
        return true;
      }

      const merged = mergeWithDefaults(parsed);
      setSettings(merged);
      setSessionVisibleOverride(null);

      if (persist) {
        notifySettingsChanged(merged);
      } else {
        lastQueuedSettingsJsonRef.current = serializeSettingsPayload(merged, settingsRevisionRef.current);
      }
      return true;
    } catch (e) {
      console.error('Failed to parse settings JSON:', e);
      return false;
    }
  }, [notifySettingsChanged]);

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

    const settingsSyncResultHandler = (success: boolean) => {
      setLastSettingsSyncOk(success);
      if (!success) {
        console.error('Settings save failed in native layer');
      }
    };

    const unregisterBridgeHandlers = registerSettingsBridgeHandlers({
      updateSettings: updateSettingsHandler,
      updateRuntimeStatus: updateRuntimeStatusHandler,
      importSettingsFromNative: importSettingsFromNativeHandler,
      toggleSettings: toggleSettingsHandler,
      toggleWidgetsVisibility: toggleWidgetsVisibilityHandler,
      closeSettings: closeSettingsHandler,
      setHUDColor: setHUDColorHandler,
    });

    window.onSettingsSyncResult = settingsSyncResultHandler;

    return () => {
      for (const unregister of unregisterBridgeHandlers) {
        unregister();
      }

      if (window.onSettingsSyncResult === settingsSyncResultHandler) {
        delete window.onSettingsSyncResult;
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
        notifySettingsChanged(next);
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
    lastSettingsSyncOk,
  };
}
