import { useEffect, useRef, useState } from 'react';
import type { Language, UpdateSettingFn, WidgetSettings } from '../../types/settings';
import { t } from '../../i18n/translations';
import {
  DEFAULT_SETTINGS_HOTKEY,
  DEFAULT_VISIBILITY_HOTKEY,
  formatHotkey,
  keyboardEventToHotkey,
  setHotkeyCaptureActive,
} from '../../utils/hotkeys';
import { claimEscape, isEscapeKey } from '../../utils/escapeOwners';

type HotkeyField = 'settingsHotkey' | 'visibilityHotkey';

interface HotkeySettingsProps {
  lang: Language;
  settings: WidgetSettings;
  onUpdate: UpdateSettingFn;
}

const FIELDS: Array<{ field: HotkeyField; labelKey: 'hotkeySettingsPanel' | 'hotkeyVisibility' }> = [
  { field: 'settingsHotkey', labelKey: 'hotkeySettingsPanel' },
  { field: 'visibilityHotkey', labelKey: 'hotkeyVisibility' },
];

// Click a key button, then press the new key; clicking again or Esc cancels (the plugin's own
// hotkeys stand aside meanwhile). Keys already in use or outside the bindable set are refused
// with a short note.
export function HotkeySettings({ lang, settings, onUpdate }: HotkeySettingsProps) {
  const [capturing, setCapturing] = useState<HotkeyField | null>(null);
  const [notice, setNotice] = useState<'hotkeyUnsupported' | 'hotkeyInUse' | null>(null);

  // Read when a key arrives, so other settings changing while a button waits (Shift+wheel opacity,
  // for one) do not restart the wait and its Esc claim.
  const latestRef = useRef({ hotkeys: settings.general, onUpdate });
  useEffect(() => {
    latestRef.current = { hotkeys: settings.general, onUpdate };
  }, [onUpdate, settings.general]);

  useEffect(() => {
    if (!capturing) return;
    setHotkeyCaptureActive(true);
    // The plugin's pause expires on its own; keep it alive while the page is still waiting.
    const keepAlive = window.setInterval(() => setHotkeyCaptureActive(true), 5000);
    // Esc stops waiting, whether the press comes as a keydown or from the plugin.
    const releaseEscape = claimEscape('hotkeyCapture', () => setCapturing(null));
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (isEscapeKey(event)) return;
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      const hotkey = keyboardEventToHotkey(event);
      if (hotkey === null) {
        setNotice('hotkeyUnsupported');
        return;
      }
      const other = capturing === 'settingsHotkey' ? 'visibilityHotkey' : 'settingsHotkey';
      const { hotkeys, onUpdate: update } = latestRef.current;
      if (hotkeys[other] === hotkey) {
        setNotice('hotkeyInUse');
        return;
      }
      setNotice(null);
      setCapturing(null);
      update(`general.${capturing}`, hotkey);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearInterval(keepAlive);
      releaseEscape();
      setHotkeyCaptureActive(false);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [capturing]);

  return (
    <div data-hotkey-settings>
      {FIELDS.map(({ field, labelKey }) => {
        const active = capturing === field;
        return (
          <div key={field} className="tw-p-row">
            <div className="tw-p-label">{t(lang, labelKey)}</div>
            <button
              type="button"
              className="tw-p-btn"
              data-hotkey-field={field}
              aria-pressed={active}
              onClick={() => {
                setNotice(null);
                setCapturing(active ? null : field);
              }}
              style={{ minWidth: 'calc(110px * var(--ps))' }}
            >
              {active ? t(lang, 'hotkeyPress') : formatHotkey(settings.general[field])}
            </button>
          </div>
        );
      })}
      <div className="tw-p-row" style={{ borderTop: 0, paddingTop: 0 }}>
        <p className={notice ? 'tw-p-help is-warn' : 'tw-p-help'} role={notice ? 'alert' : undefined} style={{ margin: 0 }}>
          {t(lang, notice ?? 'hotkeyHint')}
        </p>
        {(settings.general.settingsHotkey !== DEFAULT_SETTINGS_HOTKEY || settings.general.visibilityHotkey !== DEFAULT_VISIBILITY_HOTKEY) ? (
          <button
            type="button"
            className="tw-p-btn is-small"
            data-hotkey-reset
            onClick={() => {
              setCapturing(null);
              setNotice(null);
              onUpdate('general.settingsHotkey', DEFAULT_SETTINGS_HOTKEY, { persist: false });
              onUpdate('general.visibilityHotkey', DEFAULT_VISIBILITY_HOTKEY);
            }}
          >
            {t(lang, 'hotkeyReset')}
          </button>
        ) : <span />}
      </div>
    </div>
  );
}
