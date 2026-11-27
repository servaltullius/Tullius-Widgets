import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BRIDGE_CALLBACKS } from '../constants/bridge';
import { callNative } from '../utils/nativeCalls';
import type {
  UpdateSettingFn,
  UpdateSettingOptions,
  WidgetSettings,
} from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';
import {
  DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT,
  NORDIC_DEFAULT_BASELINE_VIEWPORT,
  getWidgetItemIdByVisibilityPath,
  hasLegacyWidgetPlacementOverrides,
  resolveWidgetItemLayouts,
} from '../data/widgetItemRegistry';
import type { RuntimeDiagnostics } from '../types/runtime';
import type { SettingsFileNotice } from '../types/settingsFileNotice';
import { isPlainObject } from '../utils/normalize';
import { NO_LOADED_SETTINGS_FILE, readRevision, updateValueByPath, type LoadedSettingsFile } from './settingsShared';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';
import { isEscapeKey } from '../utils/escapeOwners';
import { useSettingsBridge } from './useSettingsBridge';
import { useSettingsSync } from './useSettingsSync';

function stampMissingItemLayoutViewportMetadata(settings: WidgetSettings): WidgetSettings {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let changed = false;
  const nextItemLayouts: WidgetSettings['itemLayouts'] = {};

  for (const [itemId, layout] of Object.entries(settings.itemLayouts)) {
    if (layout.viewportWidth !== undefined && layout.viewportHeight !== undefined) {
      nextItemLayouts[itemId] = layout;
      continue;
    }

    changed = true;
    nextItemLayouts[itemId] = {
      ...layout,
      viewportWidth,
      viewportHeight,
    };
  }

  if (!changed) {
    return settings;
  }

  return {
    ...settings,
    itemLayouts: nextItemLayouts,
  };
}

function resolveCanonicalViewportBaseline(settings: WidgetSettings): { width: number; height: number } {
  const counts = new Map<string, { width: number; height: number; count: number }>();

  for (const layout of Object.values(settings.itemLayouts)) {
    if (
      layout.viewportWidth === undefined
      || layout.viewportHeight === undefined
      || layout.viewportWidth <= 0
      || layout.viewportHeight <= 0
    ) {
      continue;
    }

    const key = `${layout.viewportWidth}x${layout.viewportHeight}`;
    const current = counts.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    counts.set(key, {
      width: layout.viewportWidth,
      height: layout.viewportHeight,
      count: 1,
    });
  }

  let best: { width: number; height: number; count: number } | null = null;
  for (const candidate of counts.values()) {
    if (!best || candidate.count > best.count) {
      best = candidate;
    }
  }

  if (best) {
    return { width: best.width, height: best.height };
  }

  return {
    width: DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.width,
    height: DEFAULT_ITEM_LAYOUT_BASELINE_VIEWPORT.height,
  };
}

function seedVisibleLegacyItemLayouts(settings: WidgetSettings): WidgetSettings {
  const baseline = Object.keys(settings.itemLayouts).length === 0
    && !hasLegacyWidgetPlacementOverrides(settings)
    ? NORDIC_DEFAULT_BASELINE_VIEWPORT
    : resolveCanonicalViewportBaseline(settings);
  const fallbackLayouts = resolveWidgetItemLayouts({
    settings,
    viewportWidth: baseline.width,
    viewportHeight: baseline.height,
  });
  let changed = false;
  const nextItemLayouts: WidgetSettings['itemLayouts'] = { ...settings.itemLayouts };

  for (const [itemId, layout] of Object.entries(fallbackLayouts)) {
    if (settings.itemLayouts[itemId] || !layout.visible) {
      continue;
    }

    changed = true;
    nextItemLayouts[itemId] = {
      ...layout,
      viewportWidth: baseline.width,
      viewportHeight: baseline.height,
    };
  }

  if (!changed) {
    return settings;
  }

  return {
    ...settings,
    itemLayouts: nextItemLayouts,
  };
}

function prepareCanonicalItemLayoutForCurrentViewport(settings: WidgetSettings, path: string): WidgetSettings {
  if (!path.startsWith('itemLayouts.')) {
    return settings;
  }

  const keys = path.split('.');
  if (keys.length < 3) {
    return settings;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const itemId = keys.slice(1, -1).join('.');
  const resolvedLayout = resolveWidgetItemLayouts({
    settings,
    viewportWidth,
    viewportHeight,
  })[itemId];

  if (!resolvedLayout) {
    return settings;
  }

  const preparedLayout = {
    ...resolvedLayout,
    viewportWidth,
    viewportHeight,
  };

  const currentLayout = settings.itemLayouts[itemId];
  if (
    currentLayout
    && currentLayout.visible === preparedLayout.visible
    && currentLayout.x === preparedLayout.x
    && currentLayout.y === preparedLayout.y
    && currentLayout.scale === preparedLayout.scale
    && currentLayout.locked === preparedLayout.locked
    && currentLayout.zIndex === preparedLayout.zIndex
    && currentLayout.viewportWidth === preparedLayout.viewportWidth
    && currentLayout.viewportHeight === preparedLayout.viewportHeight
  ) {
    return settings;
  }

  return {
    ...settings,
    itemLayouts: {
      ...settings.itemLayouts,
      [itemId]: preparedLayout,
    },
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudColor, setHudColor] = useState('#ffffff');
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  // Tells the player when the saved settings could not be read: first that the view started from
  // defaults (the file is untouched until something is changed), then, once a change has been
  // saved over it, the name the plugin kept the old file under. Shown until dismissed.
  const [settingsFileNotice, setSettingsFileNotice] = useState<SettingsFileNotice | null>(null);
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
  const loadedSettingsFileRef = useRef<LoadedSettingsFile>(NO_LOADED_SETTINGS_FILE);
  const warnedFutureSettingsSchemaRef = useRef(false);
  const settingsRef = useRef(settings);
  const {
    lastSettingsSyncOk,
    settingsSyncState,
    notifySettingsChanged,
    rememberQueuedSettings,
    handleSettingsSyncResult,
    retryPersistedSettings,
  } = useSettingsSync({ settingsRevisionRef, loadedSettingsFileRef });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const applyIncomingSettings = useCallback((jsonString: string, persist: boolean): boolean => {
    // The saved file (not an imported preset, which reports its own result) could not be taken
    // in: the plugin logs why, so the next occurrence can be traced.
    const reportLoadFailure = (reason: string) => {
      if (persist) return;
      // Only news while nothing was read yet: a copy that fails later leaves the settings in use.
      if (!loadedSettingsFileRef.current.taken) {
        setSettingsFileNotice(current => current ?? { kind: 'loadFailed' });
      }
      try {
        callNative(BRIDGE_CALLBACKS.onSettingsLoadFailed, `${reason} (${jsonString.length} chars)`);
      } catch (error) {
        console.error('[TulliusWidgets] Failed to report a settings load failure:', error);
      }
    };
    // Restored when the settings are not applied after all, so a file that failed is not counted
    // as taken in (and a good copy of it that follows is not turned away as stale).
    let revisionsBeforeAccept: { lastApplied: number | null; settings: number } | null = null;
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        console.error('Failed to parse settings JSON:', e);
        reportLoadFailure(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
      if (!isPlainObject(parsed)) {
        console.error('Failed to apply settings: payload is not an object');
        reportLoadFailure('payload is not an object');
        return false;
      }

      warnFutureSettingsSchemaVersion(parsed, warnedFutureSettingsSchemaRef);
      revisionsBeforeAccept = {
        lastApplied: lastAppliedSettingsRevisionRef.current,
        settings: settingsRevisionRef.current,
      };
      if (!acceptIncomingSettingsRevision(parsed, lastAppliedSettingsRevisionRef, settingsRevisionRef)) {
        return true;
      }

      const mergedWithDefaults = mergeWithDefaults(parsed, {
        allowLegacyStandaloneLevelFallback: persist,
      });
      if (persist) {
        // Imported presets never rebind the player's keys or replace their saved layout slots.
        mergedWithDefaults.general.settingsHotkey = settingsRef.current.general.settingsHotkey;
        mergedWithDefaults.general.visibilityHotkey = settingsRef.current.general.visibilityHotkey;
        mergedWithDefaults.layoutSlots = settingsRef.current.layoutSlots;
      }
      const seededLegacyLayouts = seedVisibleLegacyItemLayouts(mergedWithDefaults);
      const merged = stampMissingItemLayoutViewportMetadata(seededLegacyLayouts);
      const shouldPersistStampedLayouts = !persist && merged !== mergedWithDefaults;
      setSettings(merged);
      dispatchVisibleOverride({ type: 'reset' });
      if (!persist) {
        loadedSettingsFileRef.current = { taken: true, rev: readRevision(parsed.rev) };
        // A later copy of the saved file was read after all; only a kept backup is still news.
        setSettingsFileNotice(current => (current?.kind === 'loadFailed' ? null : current));
      }

      if (persist || shouldPersistStampedLayouts) {
        notifySettingsChanged(merged);
      } else {
        rememberQueuedSettings(merged, settingsRevisionRef.current);
      }
      return true;
    } catch (e) {
      console.error('Failed to apply settings:', e);
      if (revisionsBeforeAccept) {
        lastAppliedSettingsRevisionRef.current = revisionsBeforeAccept.lastApplied;
        settingsRevisionRef.current = revisionsBeforeAccept.settings;
      }
      reportLoadFailure(`apply error: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }, [notifySettingsChanged, rememberQueuedSettings]);

  // The plugin found the saved file but could not read it (empty, too large or locked), so it
  // never reached this view.
  const showSettingsLoadFailure = useCallback(() => {
    if (loadedSettingsFileRef.current.taken) return;
    setSettingsFileNotice(current => current ?? { kind: 'loadFailed' });
  }, []);

  const showSettingsBackupNotice = useCallback((fileName: string) => {
    if (typeof fileName !== 'string' || fileName.trim() === '') return;
    setSettingsFileNotice({ kind: 'backup', fileName: fileName.trim() });
  }, []);

  const dismissSettingsFileNotice = useCallback(() => {
    setSettingsFileNotice(null);
  }, []);

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
    showSettingsBackupNotice,
    showSettingsLoadFailure,
  });

  // ESC key closes settings and requests unfocus.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEscapeKey(e) && settingsOpen && !e.defaultPrevented && !e.repeat) {
        setSettingsOpen(false);
        callNative(BRIDGE_CALLBACKS.onRequestUnfocus, '');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    callNative(BRIDGE_CALLBACKS.onSettingsVisibilityChanged, settingsOpen ? 'open' : 'closed');
  }, [settingsOpen]);

  // A change made with persist: false waits for the next saving update to carry it. When that
  // update turns out to change nothing (a drag that kept its Y, the same option picked again),
  // the waiting change is saved anyway instead of being lost on restart.
  const unsavedChangeRef = useRef(false);

  const updateSetting = useCallback<UpdateSettingFn>((path: string, value: unknown, options?: UpdateSettingOptions) => {
    const canonicalItemId = typeof value === 'boolean'
      ? getWidgetItemIdByVisibilityPath(path)
      : null;
    const effectivePath = canonicalItemId
      ? `itemLayouts.${canonicalItemId}.visible`
      : path;

    const persist = options?.persist !== false;
    if (persist && !unsavedChangeRef.current) {
      const currentSettings = settingsRef.current;
      const seededCurrentSettings = prepareCanonicalItemLayoutForCurrentViewport(currentSettings, effectivePath);
      if (updateValueByPath(seededCurrentSettings, effectivePath, value) === seededCurrentSettings && retryPersistedSettings(currentSettings)) {
        return;
      }
    }

    setSettings(prev => {
      const seededPrev = prepareCanonicalItemLayoutForCurrentViewport(prev, effectivePath);
      const next = updateValueByPath(seededPrev, effectivePath, value);
      if (next === seededPrev) {
        if (persist && unsavedChangeRef.current) {
          unsavedChangeRef.current = false;
          notifySettingsChanged(prev);
        }
        return prev;
      }

      if (effectivePath === 'general.visible') {
        dispatchVisibleOverride({ type: 'reset' });
      }

      if (persist) {
        unsavedChangeRef.current = false;
        notifySettingsChanged(next);
      } else {
        unsavedChangeRef.current = true;
      }

      return next;
    });
  }, [notifySettingsChanged, retryPersistedSettings]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    callNative(BRIDGE_CALLBACKS.onRequestUnfocus, '');
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
    settingsFileNotice,
    dismissSettingsFileNotice,
  };
}
