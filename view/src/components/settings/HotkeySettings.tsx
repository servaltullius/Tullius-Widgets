import { useEffect, useState } from 'react';
import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';
import { formatHotkey, keyboardEventToHotkey, setHotkeyCaptureActive } from '../../utils/hotkeys';
import { scalePanelPixels } from './panelScale';

type HotkeyField = 'settingsHotkey' | 'visibilityHotkey';

interface HotkeySettingsProps {
  lang: Language;
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
  panelScale?: number;
}

const FIELDS: Array<{ field: HotkeyField; labelKey: 'hotkeySettingsPanel' | 'hotkeyVisibility' }> = [
  { field: 'settingsHotkey', labelKey: 'hotkeySettingsPanel' },
  { field: 'visibilityHotkey', labelKey: 'hotkeyVisibility' },
];

// Click a key button, then press the new key; clicking again cancels. Keys already in use or
// outside the bindable set are refused with a short note.
export function HotkeySettings({ lang, settings, onUpdate, panelScale = 1 }: HotkeySettingsProps) {
  const [capturing, setCapturing] = useState<HotkeyField | null>(null);
  const [notice, setNotice] = useState<'hotkeyUnsupported' | 'hotkeyInUse' | null>(null);

  useEffect(() => {
    if (!capturing) return;
    setHotkeyCaptureActive(true);
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape' || event.code === 'Escape' || event.keyCode === 27) {
        setCapturing(null);
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      const hotkey = keyboardEventToHotkey(event);
      if (hotkey === null) {
        setNotice('hotkeyUnsupported');
        return;
      }
      const other = capturing === 'settingsHotkey' ? 'visibilityHotkey' : 'settingsHotkey';
      if (settings.general[other] === hotkey) {
        setNotice('hotkeyInUse');
        return;
      }
      setNotice(null);
      setCapturing(null);
      onUpdate(`general.${capturing}`, hotkey);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      setHotkeyCaptureActive(false);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [capturing, onUpdate, settings.general]);

  return (
    <div data-hotkey-settings style={{ padding: `${scalePanelPixels(8, panelScale)} 0` }}>
      {FIELDS.map(({ field, labelKey }) => {
        const active = capturing === field;
        return (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(4, panelScale)} 0` }}
          >
            <span style={{ color: '#aaa', fontSize: scalePanelPixels(20, panelScale) }}>{t(lang, labelKey)}</span>
            <button
              type="button"
              data-hotkey-field={field}
              aria-pressed={active}
              onClick={() => {
                setNotice(null);
                setCapturing(active ? null : field);
              }}
              style={{
                minWidth: scalePanelPixels(130, panelScale),
                background: active ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${active ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.2)'}`,
                color: active ? '#ffe58a' : '#e6e6e6',
                fontSize: scalePanelPixels(18, panelScale),
                fontWeight: 600,
                borderRadius: scalePanelPixels(6, panelScale),
                padding: `${scalePanelPixels(6, panelScale)} ${scalePanelPixels(12, panelScale)}`,
                cursor: 'pointer',
              }}
            >
              {active ? t(lang, 'hotkeyPress') : formatHotkey(settings.general[field])}
            </button>
          </div>
        );
      })}
      <p style={{ color: notice ? '#e4a07d' : '#88a4c4', fontSize: scalePanelPixels(16, panelScale), margin: `${scalePanelPixels(4, panelScale)} 0 0 0` }}>
        {t(lang, notice ?? 'hotkeyHint')}
      </p>
    </div>
  );
}
