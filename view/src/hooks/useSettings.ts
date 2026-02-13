import { useState, useEffect, useCallback } from 'react';
import type { WidgetSettings } from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    (window as any).updateSettings = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as WidgetSettings;
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse settings JSON:', e);
      }
    };

    (window as any).toggleSettings = () => {
      setSettingsOpen(prev => !prev);
    };

    return () => {
      delete (window as any).updateSettings;
      delete (window as any).toggleSettings;
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

      if ((window as any).onSettingsChanged) {
        (window as any).onSettingsChanged(JSON.stringify(next));
      }

      return next;
    });
  }, []);

  return { settings, settingsOpen, setSettingsOpen, updateSetting };
}
