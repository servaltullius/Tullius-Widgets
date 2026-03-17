import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { Language, UpdateSettingFn, WidgetLayout } from '../../types/settings';
import { t } from '../../i18n/translations';
import { scalePanelPixels } from './panelScale';
import { createPanelCheckboxStyle } from './checkboxStyles';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  panelScale?: number;
}

export function Toggle({ label, checked, onChange, panelScale = 1 }: ToggleProps) {
  return (
    <label style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: scalePanelPixels(16, panelScale),
      minHeight: scalePanelPixels(40, panelScale),
      padding: `${scalePanelPixels(8, panelScale)} 0`,
      cursor: 'pointer',
    }}>
      <span style={{ color: '#ddd', fontSize: scalePanelPixels(24, panelScale) }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        style={createPanelCheckboxStyle(panelScale, checked)}
      />
    </label>
  );
}

interface CustomSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  panelScale?: number;
  testId?: string;
}

export function CustomSelect({ value, options, onChange, panelScale = 1, testId }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div data-testid={testId} onClick={() => setOpen(!open)} style={{
        background: '#333', color: '#fff', border: '1px solid #555',
        borderRadius: scalePanelPixels(6, panelScale),
        padding: `${scalePanelPixels(8, panelScale)} ${scalePanelPixels(16, panelScale)}`,
        fontSize: scalePanelPixels(24, panelScale),
        cursor: 'pointer', userSelect: 'none', minWidth: scalePanelPixels(120, panelScale), textAlign: 'center',
      }}>
        {selected?.label ?? value} ▾
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 10,
          background: '#2a2a3a', border: '1px solid #555', borderRadius: scalePanelPixels(6, panelScale),
          marginTop: scalePanelPixels(4, panelScale), minWidth: '100%', overflow: 'hidden',
        }}>
          {options.map(option => (
            <div key={option.value}
              data-testid={testId ? `${testId}-option-${option.value}` : undefined}
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{
                padding: `${scalePanelPixels(12, panelScale)} ${scalePanelPixels(20, panelScale)}`,
                fontSize: scalePanelPixels(24, panelScale), color: '#fff',
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
  lang: Language;
  groupId: string;
  value: WidgetLayout;
  onUpdate: UpdateSettingFn;
  panelScale?: number;
}

export function LayoutSelect({ lang, groupId, value, onUpdate, panelScale = 1 }: LayoutSelectProps) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${scalePanelPixels(8, panelScale)} 0` }}>
      <span style={{ color: '#aaa', fontSize: scalePanelPixels(24, panelScale) }}>{t(lang, 'layout')}</span>
      <CustomSelect value={value}
        options={[
          { value: 'vertical', label: t(lang, 'layoutVertical') },
          { value: 'horizontal', label: t(lang, 'layoutHorizontal') },
        ]}
        onChange={nextValue => onUpdate(`layouts.${groupId}`, nextValue)}
        panelScale={panelScale}
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
  panelScale?: number;
}

export function AccordionSection({
  id,
  title,
  expanded,
  onToggle,
  children,
  panelScale = 1,
}: AccordionSectionProps) {
  return (
    <div style={{
      marginBottom: scalePanelPixels(16, panelScale),
      border: '1px solid rgba(255, 215, 0, 0.2)',
      borderRadius: scalePanelPixels(10, panelScale),
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
          fontSize: scalePanelPixels(26, panelScale),
          padding: `${scalePanelPixels(12, panelScale)} ${scalePanelPixels(16, panelScale)}`,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div style={{ padding: `${scalePanelPixels(10, panelScale)} ${scalePanelPixels(16, panelScale)} ${scalePanelPixels(14, panelScale)} ${scalePanelPixels(16, panelScale)}` }}>
          {children}
        </div>
      )}
    </div>
  );
}
