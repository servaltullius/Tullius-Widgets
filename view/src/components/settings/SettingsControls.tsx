import { useState, type ReactNode } from 'react';
import type { UpdateSettingFn, WidgetLayout } from '../../types/settings';
import { t } from '../../i18n/translations';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
      <span style={{ color: '#ddd', fontSize: '24px' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        style={{ width: '26px', height: '26px', cursor: 'pointer' }}
      />
    </label>
  );
}

interface CustomSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function CustomSelect({ value, options, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

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
          {options.map(option => (
            <div key={option.value}
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{
                padding: '12px 20px', fontSize: '24px', color: '#fff',
                cursor: 'pointer',
                background: option.value === value ? '#4a4a5a' : 'transparent',
              }}
              onMouseEnter={event => { event.currentTarget.style.background = '#3a3a4a'; }}
              onMouseLeave={event => { event.currentTarget.style.background = option.value === value ? '#4a4a5a' : 'transparent'; }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LayoutSelectProps {
  lang: 'ko' | 'en';
  groupId: string;
  value: WidgetLayout;
  onUpdate: UpdateSettingFn;
}

export function LayoutSelect({ lang, groupId, value, onUpdate }: LayoutSelectProps) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
      <span style={{ color: '#aaa', fontSize: '24px' }}>{t(lang, 'layout')}</span>
      <CustomSelect value={value}
        options={[
          { value: 'vertical', label: t(lang, 'layoutVertical') },
          { value: 'horizontal', label: t(lang, 'layoutHorizontal') },
        ]}
        onChange={nextValue => onUpdate(`layouts.${groupId}`, nextValue)}
      />
    </label>
  );
}

interface AccordionSectionProps {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

export function AccordionSection({
  id,
  title,
  expanded,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div style={{
      marginBottom: '16px',
      border: '1px solid rgba(255, 215, 0, 0.2)',
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'rgba(255, 255, 255, 0.03)',
    }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 215, 0, 0.08)',
          border: 'none',
          color: '#ffd700',
          fontSize: '26px',
          padding: '12px 16px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '10px 16px 14px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
