import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BRIDGE_CALLBACKS } from '../constants/bridge';
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
import { isPlainObject } from '../utils/normalize';
import { updateValueByPath } from './settingsShared';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';
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

      const mergedWithDefaults = mergeWithDefaults(parsed, {
        allowLegacyStandaloneLevelFallback: persist,
      });
      const seededLegacyLayouts = seedVisibleLegacyItemLayouts(mergedWithDefaults);
      const merged = stampMissingItemLayoutViewportMetadata(seededLegacyLayouts);
      const shouldPersistStampedLayouts = !persist && merged !== mergedWithDefaults;
      setSettings(merged);
      dispatchVisibleOverride({ type: 'reset' });

      if (persist || shouldPersistStampedLayouts) {
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
        window[BRIDGE_CALLBACKS.onRequestUnfocus]?.('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    window[BRIDGE_CALLBACKS.onSettingsVisibilityChanged]?.(settingsOpen ? 'open' : 'closed');
  }, [settingsOpen]);

  const updateSetting = useCallback<UpdateSettingFn>((path: string, value: unknown, options?: UpdateSettingOptions) => {
    const canonicalItemId = typeof value === 'boolean'
      ? getWidgetItemIdByVisibilityPath(path)
      : null;
    const effectivePath = canonicalItemId
      ? `itemLayouts.${canonicalItemId}.visible`
      : path;

    if (options?.persist !== false) {
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
        return prev;
      }

      if (effectivePath === 'general.visible') {
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
    window[BRIDGE_CALLBACKS.onRequestUnfocus]?.('');
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
