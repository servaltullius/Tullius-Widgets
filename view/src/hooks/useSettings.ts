import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WidgetSettings } from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';

// Deep merge: fill missing keys from defaults so old saved files don't crash
function mergeWithDefaults(saved: any): WidgetSettings {
  const merged = structuredClone(defaultSettings);
  if (!saved || typeof saved !== 'object') return merged;
  for (const key of Object.keys(merged) as (keyof WidgetSettings)[]) {
    if (!(key in saved)) continue;
    if (typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])) {
      merged[key] = { ...merged[key], ...saved[key] } as any;
    } else {
      (merged as any)[key] = saved[key];
    }
  }
  return merged;
}

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudColor, setHudColor] = useState('#ffffff');

  useEffect(() => {
    (window as any).updateSettings = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        setSettings(mergeWithDefaults(parsed));
      } catch (e) {
        console.error('Failed to parse settings JSON:', e);
      }
    };

    (window as any).toggleSettings = () => {
      setSettingsOpen(prev => !prev);
    };

    (window as any).closeSettings = () => {
      setSettingsOpen(false);
    };

    (window as any).setHUDColor = (hex: string) => {
      setHudColor(hex);
    };

    return () => {
      delete (window as any).updateSettings;
      delete (window as any).toggleSettings;
      delete (window as any).closeSettings;
      delete (window as any).setHUDColor;
    };
  }, []);

  // ESC key closes settings and requests unfocus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
        (window as any).onRequestUnfocus?.('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  const debouncedNotify = useMemo(() => {
    let timer: number;
    return (json: string) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        (window as any).onSettingsChanged?.(json);
      }, 200);
    };
  }, []);

  const updateSetting = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;

      debouncedNotify(JSON.stringify(next));

      return next;
    });
  }, [debouncedNotify]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    (window as any).onRequestUnfocus?.('');
  }, []);

  // Resolved accent color: manual override > auto HUD color
  const accentColor = settings.general.accentColor || hudColor;

  return { settings, settingsOpen, setSettingsOpen, closeSettings, updateSetting, accentColor, hudColor };
}
