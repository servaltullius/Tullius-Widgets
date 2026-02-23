import { useEffect, useRef, useState } from 'react';
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

    window.onExportResult = (success: boolean) => {
      if (success) {
        setMessage(t(lang, 'exportDone'));
        scheduleMessageClear();
      }
    };
    window.onImportResult = (success: boolean) => {
      setMessage(t(lang, success ? 'importDone' : 'importFail'));
      scheduleMessageClear();
    };
    return () => {
      delete window.onExportResult;
      delete window.onImportResult;
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
        messageTimerRef.current = null;
      }
    };
  }, [lang]);

  const buttonStyle = {
    background: 'rgba(100,180,255,0.15)',
    border: '1px solid rgba(100,180,255,0.4)',
    color: '#88ccff',
    fontSize: '20px',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '12px 20px',
    flex: 1,
  } as const;

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
        <button style={buttonStyle} onClick={() => window.onExportSettings?.(JSON.stringify(settings))}>
          {t(lang, 'exportPreset')}
        </button>
        <button style={buttonStyle} onClick={() => window.onImportSettings?.('')}>
          {t(lang, 'importPreset')}
        </button>
      </div>
      {message && (
        <p style={{ color: '#88ff88', fontSize: '18px', margin: '4px 0', textAlign: 'center' }}>{message}</p>
      )}
      <p style={{ color: '#666', fontSize: '16px', margin: '4px 0 0 0', textAlign: 'center', wordBreak: 'break-all' }}>
        {t(lang, 'presetHint')}
      </p>
    </>
  );
}
