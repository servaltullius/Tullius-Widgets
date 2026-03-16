import { useEffect, useRef, useState } from 'react';
import { BRIDGE_CALLBACKS } from '../../constants/bridge';
import type { Language, WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';
import { scalePanelPixels } from './panelScale';

interface PresetSectionProps {
  lang: Language;
  settings: WidgetSettings;
  panelScale?: number;
}

function buildPresetExportPayload(settings: WidgetSettings): string {
  const presetSettings: Partial<WidgetSettings> = { ...settings };
  delete presetSettings.positions;
  delete presetSettings.layouts;
  delete presetSettings.groupScales;
  return JSON.stringify(presetSettings);
}

export function PresetSection({ lang, settings, panelScale = 1 }: PresetSectionProps) {
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

  const buttonStyle = {
    background: 'var(--tw-color-button-strong-bg)',
    border: '1px solid var(--tw-color-button-strong-border)',
    color: 'var(--tw-color-button-strong-text)',
    fontSize: scalePanelPixels(20, panelScale),
    cursor: 'pointer',
    borderRadius: 'var(--tw-radius-sm)',
    padding: `${scalePanelPixels(12, panelScale)} ${scalePanelPixels(20, panelScale)}`,
    flex: 1,
    fontFamily: 'var(--tw-font-ui)',
  } as const;

  return (
    <>
      <div style={{ display: 'flex', gap: scalePanelPixels(12, panelScale), marginBottom: scalePanelPixels(8, panelScale) }}>
        <button style={buttonStyle} onClick={() => window[BRIDGE_CALLBACKS.onExportSettings]?.(buildPresetExportPayload(settings))}>
          {t(lang, 'exportPreset')}
        </button>
        <button style={buttonStyle} onClick={() => window[BRIDGE_CALLBACKS.onImportSettings]?.('')}>
          {t(lang, 'importPreset')}
        </button>
      </div>
      {message && (
        <p style={{ color: 'var(--tw-color-success-text)', fontSize: scalePanelPixels(18, panelScale), margin: `${scalePanelPixels(4, panelScale)} 0`, textAlign: 'center' }}>{message}</p>
      )}
      <p style={{ color: 'var(--tw-color-hint-text)', fontSize: scalePanelPixels(16, panelScale), margin: `${scalePanelPixels(4, panelScale)} 0 0 0`, textAlign: 'center', wordBreak: 'break-all' }}>
        {t(lang, 'presetHint')}
      </p>
    </>
  );
}
