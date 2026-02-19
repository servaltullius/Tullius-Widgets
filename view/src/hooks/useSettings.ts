import { useCallback, useEffect, useRef, useState } from 'react';
import type { UpdateSettingFn, UpdateSettingOptions, WidgetSettings } from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Deep merge: fill missing keys from defaults so old saved files don't crash.
function mergeWithDefaults(saved: unknown): WidgetSettings {
  const merged = structuredClone(defaultSettings);
  if (!isPlainObject(saved)) return merged;

  const source = saved as Record<string, unknown>;
  const mutable = merged as unknown as Record<keyof WidgetSettings, unknown>;

  for (const key of Object.keys(merged) as (keyof WidgetSettings)[]) {
    if (!(key in source)) continue;

    const incoming = source[key as string];
    const current = mutable[key];
    if (isPlainObject(current) && isPlainObject(incoming)) {
      mutable[key] = { ...current, ...incoming };
    } else {
      mutable[key] = incoming;
    }
  }

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
  const debounceTimerRef = useRef<number | null>(null);

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
      const merged = mergeWithDefaults(parsed);
      setSettings(merged);
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

    window.importSettingsFromNative = (jsonString: string) => {
      const success = applyIncomingSettings(jsonString, true);
      window.onImportResult?.(success);
    };

    window.toggleSettings = () => {
      setSettingsOpen(prev => !prev);
    };

    window.closeSettings = () => {
      setSettingsOpen(false);
    };

    window.setHUDColor = (hex: string) => {
      setHudColor(hex);
    };

    return () => {
      delete window.updateSettings;
      delete window.importSettingsFromNative;
      delete window.toggleSettings;
      delete window.closeSettings;
      delete window.setHUDColor;
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
      const next = structuredClone(prev);
      setValueByPath(next, path, value);

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

  return { settings, settingsOpen, setSettingsOpen, closeSettings, updateSetting, accentColor, hudColor };
}
