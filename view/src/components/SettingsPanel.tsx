import { useState, useEffect, useRef } from 'react';
import type { UpdateSettingFn, WidgetSettings, WidgetLayout } from '../types/settings';
import { t } from '../i18n/translations';

interface SettingsPanelProps {
  settings: WidgetSettings;
  open: boolean;
  onClose: () => void;
  onUpdate: UpdateSettingFn;
  accentColor: string;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
      <span style={{ color: '#ddd', fontSize: '24px' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '26px', height: '26px', cursor: 'pointer' }}
      />
    </label>
  );
}

function CustomSelect({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{
        background: '#333', color: '#fff', border: '1px solid #555',
        borderRadius: '6px', padding: '8px 16px', fontSize: '24px',
        cursor: 'pointer', userSelect: 'none', minWidth: '120px', textAlign: 'center',
      }}>
        {selected?.label ?? value} ▾
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 10,
          background: '#2a2a3a', border: '1px solid #555', borderRadius: '6px',
          marginTop: '4px', minWidth: '100%', overflow: 'hidden',
        }}>
          {options.map(o => (
            <div key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: '12px 20px', fontSize: '24px', color: '#fff',
                cursor: 'pointer',
                background: o.value === value ? '#4a4a5a' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3a3a4a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? '#4a4a5a' : 'transparent'; }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutSelect({
  lang,
  groupId,
  value,
  onUpdate,
}: {
  lang: 'ko' | 'en';
  groupId: string;
  value: WidgetLayout;
  onUpdate: UpdateSettingFn;
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
      <span style={{ color: '#aaa', fontSize: '24px' }}>{t(lang, 'layout')}</span>
      <CustomSelect value={value}
        options={[
          { value: 'vertical', label: t(lang, 'layoutVertical') },
          { value: 'horizontal', label: t(lang, 'layoutHorizontal') },
        ]}
        onChange={v => onUpdate(`layouts.${groupId}`, v)}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <h3 style={{ color: '#ffd700', fontSize: '28px', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '8px' }}>{title}</h3>
      {children}
    </div>
  );
}


function PresetSection({ lang, settings }: { lang: 'ko' | 'en'; settings: WidgetSettings }) {
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

  const btnStyle = {
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
    <Section title={t(lang, 'preset')}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
        <button style={btnStyle} onClick={() => window.onExportSettings?.(JSON.stringify(settings))}>
          {t(lang, 'exportPreset')}
        </button>
        <button style={btnStyle} onClick={() => window.onImportSettings?.('')}>
          {t(lang, 'importPreset')}
        </button>
      </div>
      {message && (
        <p style={{ color: '#88ff88', fontSize: '18px', margin: '4px 0', textAlign: 'center' }}>{message}</p>
      )}
      <p style={{ color: '#666', fontSize: '16px', margin: '4px 0 0 0', textAlign: 'center', wordBreak: 'break-all' }}>
        {t(lang, 'presetHint')}
      </p>
    </Section>
  );
}

const PRESET_COLORS = [
  '', '#6699cc', '#cc6666', '#66cc99', '#cc99cc', '#ccaa66', '#66cccc', '#ffffff',
];

export function SettingsPanel({ settings, open, onClose, onUpdate, accentColor }: SettingsPanelProps) {
  if (!open) return null;

  const lang = settings.general.language;
  const groupLayout = (groupId: string): WidgetLayout => settings.layouts[groupId] ?? 'vertical';

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 20, 30, 0.95)',
      borderRadius: '16px',
      padding: '40px',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      minWidth: '680px',
      maxHeight: '85vh',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h2 style={{ color: '#ffd700', margin: 0, fontSize: '36px' }}>{t(lang, 'title')}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ccc',
            fontSize: '22px',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '8px 20px',
          }}
        >
          {t(lang, 'close')} (ESC)
        </button>
      </div>

      <Section title={t(lang, 'general')}>
        <Toggle label={t(lang, 'showWidgets')} checked={settings.general.visible} onChange={v => onUpdate('general.visible', v)} />
        <Toggle label={t(lang, 'combatOnly')} checked={settings.general.combatOnly} onChange={v => onUpdate('general.combatOnly', v)} />

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'opacity')}: {settings.general.opacity}%</span>
          <input type="range" min={10} max={100} value={settings.general.opacity}
            onChange={e => onUpdate('general.opacity', Number(e.target.value))}
            style={{ width: '220px', height: '8px' }} />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'size')}</span>
          <CustomSelect value={settings.general.size}
            options={[
              { value: 'small', label: t(lang, 'small') },
              { value: 'medium', label: t(lang, 'medium') },
              { value: 'large', label: t(lang, 'large') },
            ]}
            onChange={v => onUpdate('general.size', v)}
          />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'language')}</span>
          <CustomSelect value={settings.general.language}
            options={[
              { value: 'ko', label: t(lang, 'korean') },
              { value: 'en', label: t(lang, 'english') },
            ]}
            onChange={v => onUpdate('general.language', v)}
          />
        </label>

        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#ddd', fontSize: '24px' }}>{t(lang, 'accentColor')}</span>
            <span style={{ color: '#888', fontSize: '18px' }}>
              {settings.general.accentColor ? settings.general.accentColor : t(lang, 'accentAuto')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map(color => (
              <div key={color || 'auto'} onClick={() => onUpdate('general.accentColor', color)}
                style={{
                  width: '36px', height: '36px', borderRadius: '6px', cursor: 'pointer',
                  background: color || `linear-gradient(135deg, #6699cc, #cc6666, #66cc99)`,
                  border: settings.general.accentColor === color
                    ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.2)',
                  boxSizing: 'border-box',
                }} title={color || t(lang, 'accentAuto')} />
            ))}
            <input type="color" value={accentColor}
              onChange={e => onUpdate('general.accentColor', e.target.value)}
              style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
          </div>
        </div>
        <Toggle label={t(lang, 'transparentBg')} checked={settings.general.transparentBg} onChange={v => onUpdate('general.transparentBg', v)} />
      </Section>

      <Section title={t(lang, 'playerInfo')}>
        <LayoutSelect lang={lang} groupId="playerInfo" value={groupLayout('playerInfo')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'level')} checked={settings.playerInfo.level} onChange={v => onUpdate('playerInfo.level', v)} />
        <Toggle label={t(lang, 'gold')} checked={settings.playerInfo.gold} onChange={v => onUpdate('playerInfo.gold', v)} />
        <Toggle label={t(lang, 'carryWeight')} checked={settings.playerInfo.carryWeight} onChange={v => onUpdate('playerInfo.carryWeight', v)} />
        <Toggle label={t(lang, 'health')} checked={settings.playerInfo.health} onChange={v => onUpdate('playerInfo.health', v)} />
        <Toggle label={t(lang, 'magicka')} checked={settings.playerInfo.magicka} onChange={v => onUpdate('playerInfo.magicka', v)} />
        <Toggle label={t(lang, 'stamina')} checked={settings.playerInfo.stamina} onChange={v => onUpdate('playerInfo.stamina', v)} />
      </Section>

      <Section title={t(lang, 'resistances')}>
        <LayoutSelect lang={lang} groupId="resistances" value={groupLayout('resistances')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'magic')} checked={settings.resistances.magic} onChange={v => onUpdate('resistances.magic', v)} />
        <Toggle label={t(lang, 'fire')} checked={settings.resistances.fire} onChange={v => onUpdate('resistances.fire', v)} />
        <Toggle label={t(lang, 'frost')} checked={settings.resistances.frost} onChange={v => onUpdate('resistances.frost', v)} />
        <Toggle label={t(lang, 'shock')} checked={settings.resistances.shock} onChange={v => onUpdate('resistances.shock', v)} />
        <Toggle label={t(lang, 'poison')} checked={settings.resistances.poison} onChange={v => onUpdate('resistances.poison', v)} />
        <Toggle label={t(lang, 'disease')} checked={settings.resistances.disease} onChange={v => onUpdate('resistances.disease', v)} />
      </Section>

      <Section title={t(lang, 'defense')}>
        <LayoutSelect lang={lang} groupId="defense" value={groupLayout('defense')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'armorRating')} checked={settings.defense.armorRating} onChange={v => onUpdate('defense.armorRating', v)} />
        <Toggle label={t(lang, 'damageReduction')} checked={settings.defense.damageReduction} onChange={v => onUpdate('defense.damageReduction', v)} />
      </Section>

      <Section title={t(lang, 'offense')}>
        <LayoutSelect lang={lang} groupId="offense" value={groupLayout('offense')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'rightHandDamage')} checked={settings.offense.rightHandDamage} onChange={v => onUpdate('offense.rightHandDamage', v)} />
        <Toggle label={t(lang, 'leftHandDamage')} checked={settings.offense.leftHandDamage} onChange={v => onUpdate('offense.leftHandDamage', v)} />
        <Toggle label={t(lang, 'critChance')} checked={settings.offense.critChance} onChange={v => onUpdate('offense.critChance', v)} />
      </Section>

      <Section title={t(lang, 'equipped')}>
        <LayoutSelect lang={lang} groupId="equipped" value={groupLayout('equipped')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'rightHandEquipped')} checked={settings.equipped.rightHand} onChange={v => onUpdate('equipped.rightHand', v)} />
        <Toggle label={t(lang, 'leftHandEquipped')} checked={settings.equipped.leftHand} onChange={v => onUpdate('equipped.leftHand', v)} />
      </Section>

      <Section title={t(lang, 'timedEffects')}>
        <LayoutSelect lang={lang} groupId="timedEffects" value={groupLayout('timedEffects')} onUpdate={onUpdate} />
        <Toggle
          label={t(lang, 'timedEffectsEnabled')}
          checked={settings.timedEffects.enabled}
          onChange={v => onUpdate('timedEffects.enabled', v)}
        />
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ color: '#aaa', fontSize: '20px' }}>
            {t(lang, 'timedEffectsMaxVisible')}: {settings.timedEffects.maxVisible}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={settings.timedEffects.maxVisible}
            onChange={e => onUpdate('timedEffects.maxVisible', Number(e.target.value))}
            style={{ width: '180px' }}
          />
        </label>
      </Section>

      <Section title={t(lang, 'movement')}>
        <LayoutSelect lang={lang} groupId="movement" value={groupLayout('movement')} onUpdate={onUpdate} />
        <Toggle label={t(lang, 'speed')} checked={settings.movement.speedMult} onChange={v => onUpdate('movement.speedMult', v)} />
      </Section>

      <Section title={t(lang, 'visualAlerts')}>
        <Toggle label={t(lang, 'visualAlertsEnabled')} checked={settings.visualAlerts.enabled} onChange={v => onUpdate('visualAlerts.enabled', v)} />
        {settings.visualAlerts.enabled && (<>
          <Toggle label={t(lang, 'lowHealth')} checked={settings.visualAlerts.lowHealth} onChange={v => onUpdate('visualAlerts.lowHealth', v)} />
          {settings.visualAlerts.lowHealth && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowHealthThreshold}%</span>
              <input type="range" min={10} max={60} value={settings.visualAlerts.lowHealthThreshold}
                onChange={e => onUpdate('visualAlerts.lowHealthThreshold', Number(e.target.value))}
                style={{ width: '180px' }} />
            </label>
          )}
          <Toggle label={t(lang, 'lowStamina')} checked={settings.visualAlerts.lowStamina} onChange={v => onUpdate('visualAlerts.lowStamina', v)} />
          {settings.visualAlerts.lowStamina && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowStaminaThreshold}%</span>
              <input type="range" min={10} max={60} value={settings.visualAlerts.lowStaminaThreshold}
                onChange={e => onUpdate('visualAlerts.lowStaminaThreshold', Number(e.target.value))}
                style={{ width: '180px' }} />
            </label>
          )}
          <Toggle label={t(lang, 'lowMagicka')} checked={settings.visualAlerts.lowMagicka} onChange={v => onUpdate('visualAlerts.lowMagicka', v)} />
          {settings.visualAlerts.lowMagicka && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px 20px' }}>
              <span style={{ color: '#aaa', fontSize: '20px' }}>{t(lang, 'threshold')}: {settings.visualAlerts.lowMagickaThreshold}%</span>
              <input type="range" min={10} max={60} value={settings.visualAlerts.lowMagickaThreshold}
                onChange={e => onUpdate('visualAlerts.lowMagickaThreshold', Number(e.target.value))}
                style={{ width: '180px' }} />
            </label>
          )}
          <Toggle label={t(lang, 'overencumbered')} checked={settings.visualAlerts.overencumbered} onChange={v => onUpdate('visualAlerts.overencumbered', v)} />
        </>)}
      </Section>

      <PresetSection lang={lang} settings={settings} />

      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
        <button
          onClick={() => onUpdate('positions', {})}
          style={{
            background: 'rgba(255,100,100,0.2)',
            border: '1px solid rgba(255,100,100,0.4)',
            color: '#ff8888',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '12px 20px',
            width: '100%',
          }}
        >
          {t(lang, 'resetPositions')}
        </button>
        <p style={{ color: '#888', fontSize: '18px', margin: '10px 0 0 0', textAlign: 'center' }}>
          {t(lang, 'dragHint')}
        </p>
      </div>
    </div>
  );
}
