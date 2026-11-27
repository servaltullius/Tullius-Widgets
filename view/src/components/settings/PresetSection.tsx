import { useEffect, useRef, useState } from 'react';
import { BRIDGE_CALLBACKS } from '../../constants/bridge';
import { callNative } from '../../utils/nativeCalls';
import type { Language, WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';

interface PresetSectionProps {
  lang: Language;
  settings: WidgetSettings;
}

function buildPresetExportPayload(settings: WidgetSettings): string {
  const presetSettings: Partial<WidgetSettings> = { ...settings };
  delete presetSettings.positions;
  delete presetSettings.layouts;
  delete presetSettings.groupScales;
  // Saved layout slots and key bindings belong to the player, not the preset.
  delete presetSettings.layoutSlots;
  const general: Partial<WidgetSettings['general']> = { ...settings.general };
  delete general.settingsHotkey;
  delete general.visibilityHotkey;
  presetSettings.general = general as WidgetSettings['general'];
  return JSON.stringify(presetSettings);
}

export function PresetSection({ lang, settings }: PresetSectionProps) {
  const [message, setMessage] = useState<string | null>(null);
  const messageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const scheduleMessageClear = () => {
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
      messageTimerRef.current = window.setTimeout(() => {
        setMessage(null);
        messageTimerRef.current = null;
      }, 3000);
    };

    window[BRIDGE_CALLBACKS.onExportResult] = (success: boolean) => {
      if (success) {
        setMessage(t(lang, 'exportDone'));
        scheduleMessageClear();
      }
    };
    window[BRIDGE_CALLBACKS.onImportResult] = (success: boolean) => {
      setMessage(t(lang, success ? 'importDone' : 'importFail'));
      scheduleMessageClear();
    };
    return () => {
      delete window[BRIDGE_CALLBACKS.onExportResult];
      delete window[BRIDGE_CALLBACKS.onImportResult];
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
        messageTimerRef.current = null;
      }
    };
  }, [lang]);

  return (
    <>
      <div className="tw-p-button-row" style={{ marginTop: 'calc(4px * var(--ps))' }}>
        <button type="button" className="tw-p-btn" style={{ flex: 1 }} onClick={() => callNative(BRIDGE_CALLBACKS.onExportSettings, buildPresetExportPayload(settings))}>
          {t(lang, 'exportPreset')}
        </button>
        <button type="button" className="tw-p-btn" style={{ flex: 1 }} onClick={() => callNative(BRIDGE_CALLBACKS.onImportSettings, '')}>
          {t(lang, 'importPreset')}
        </button>
      </div>
      {message && (
        <p className={`tw-p-note tw-p-help ${message === t(lang, 'importFail') ? 'is-warn' : 'is-good'}`} role="status">{message}</p>
      )}
      <p className="tw-p-note">{t(lang, 'presetHint')}</p>
    </>
  );
}
