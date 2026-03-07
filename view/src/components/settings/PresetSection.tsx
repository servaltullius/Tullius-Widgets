import { useEffect, useRef, useState } from 'react';
import { BRIDGE_CALLBACKS } from '../../constants/bridge';
import type { WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';

interface PresetSectionProps {
  lang: 'ko' | 'en';
  settings: WidgetSettings;
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

  const buttonStyle = {
    background: 'var(--tw-color-button-strong-bg)',
    border: '1px solid var(--tw-color-button-strong-border)',
    color: 'var(--tw-color-button-strong-text)',
    fontSize: '20px',
    cursor: 'pointer',
    borderRadius: 'var(--tw-radius-sm)',
    padding: '12px 20px',
    flex: 1,
    fontFamily: 'var(--tw-font-ui)',
  } as const;

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
        <button style={buttonStyle} onClick={() => window[BRIDGE_CALLBACKS.onExportSettings]?.(JSON.stringify(settings))}>
          {t(lang, 'exportPreset')}
        </button>
        <button style={buttonStyle} onClick={() => window[BRIDGE_CALLBACKS.onImportSettings]?.('')}>
          {t(lang, 'importPreset')}
        </button>
      </div>
      {message && (
        <p style={{ color: 'var(--tw-color-success-text)', fontSize: '18px', margin: '4px 0', textAlign: 'center' }}>{message}</p>
      )}
      <p style={{ color: 'var(--tw-color-hint-text)', fontSize: '16px', margin: '4px 0 0 0', textAlign: 'center', wordBreak: 'break-all' }}>
        {t(lang, 'presetHint')}
      </p>
    </>
  );
}
