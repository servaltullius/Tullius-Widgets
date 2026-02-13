import type { WidgetSettings, WidgetPosition, WidgetSize } from '../types/settings';

interface SettingsPanelProps {
  settings: WidgetSettings;
  open: boolean;
  onClose: () => void;
  onUpdate: (path: string, value: any) => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
      <span style={{ color: '#ddd', fontSize: '13px' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h3 style={{ color: '#ffd700', fontSize: '14px', margin: '0 0 6px 0', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '4px' }}>{title}</h3>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, open, onClose, onUpdate }: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 20, 30, 0.95)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      minWidth: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#ffd700', margin: 0, fontSize: '18px' }}>Tullius Widgets</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>X</button>
      </div>

      <Section title="General">
        <Toggle label="Show Widgets" checked={settings.general.visible} onChange={v => onUpdate('general.visible', v)} />
        <Toggle label="Combat Only" checked={settings.general.combatOnly} onChange={v => onUpdate('general.combatOnly', v)} />
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Opacity: {settings.general.opacity}%</span>
          <input type="range" min={10} max={100} value={settings.general.opacity} onChange={e => onUpdate('general.opacity', Number(e.target.value))} />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Size</span>
          <select value={settings.general.size} onChange={e => onUpdate('general.size', e.target.value as WidgetSize)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '2px 6px' }}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Position</span>
          <select value={settings.general.position} onChange={e => onUpdate('general.position', e.target.value as WidgetPosition)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '2px 6px' }}>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </label>
      </Section>

      <Section title="Resistances">
        <Toggle label="Magic" checked={settings.resistances.magic} onChange={v => onUpdate('resistances.magic', v)} />
        <Toggle label="Fire" checked={settings.resistances.fire} onChange={v => onUpdate('resistances.fire', v)} />
        <Toggle label="Frost" checked={settings.resistances.frost} onChange={v => onUpdate('resistances.frost', v)} />
        <Toggle label="Shock" checked={settings.resistances.shock} onChange={v => onUpdate('resistances.shock', v)} />
        <Toggle label="Poison" checked={settings.resistances.poison} onChange={v => onUpdate('resistances.poison', v)} />
        <Toggle label="Disease" checked={settings.resistances.disease} onChange={v => onUpdate('resistances.disease', v)} />
      </Section>

      <Section title="Defense">
        <Toggle label="Armor Rating" checked={settings.defense.armorRating} onChange={v => onUpdate('defense.armorRating', v)} />
        <Toggle label="Damage Reduction" checked={settings.defense.damageReduction} onChange={v => onUpdate('defense.damageReduction', v)} />
      </Section>

      <Section title="Offense">
        <Toggle label="Right Hand Damage" checked={settings.offense.rightHandDamage} onChange={v => onUpdate('offense.rightHandDamage', v)} />
        <Toggle label="Left Hand Damage" checked={settings.offense.leftHandDamage} onChange={v => onUpdate('offense.leftHandDamage', v)} />
        <Toggle label="Critical Chance" checked={settings.offense.critChance} onChange={v => onUpdate('offense.critChance', v)} />
      </Section>

      <Section title="Movement">
        <Toggle label="Speed" checked={settings.movement.speedMult} onChange={v => onUpdate('movement.speedMult', v)} />
      </Section>
    </div>
  );
}
