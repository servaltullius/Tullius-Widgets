import { useCallback, useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

const DROPDOWN_GAP_PX = 4;
const DROPDOWN_OPTION_HEIGHT_PX = 48;
const DROPDOWN_BORDER_PX = 1;

export function CustomSelect({ value, options, onChange, panelScale = 1, testId }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  const dropdownGap = DROPDOWN_GAP_PX * panelScale;
  const estimatedOptionHeight = DROPDOWN_OPTION_HEIGHT_PX * panelScale;

  const resolveDropdownPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const estimatedMenuHeight = options.length * estimatedOptionHeight + 2 * DROPDOWN_BORDER_PX;
    const viewportBottom = Math.max(dropdownGap, window.innerHeight - dropdownGap);
    const lowerStart = Math.max(dropdownGap, Math.min(viewportBottom, rect.bottom + dropdownGap));
    const upperEnd = Math.max(dropdownGap, Math.min(viewportBottom, rect.top - dropdownGap));
    const below = viewportBottom - lowerStart;
    const above = upperEnd - dropdownGap;
    const opensUpward = below < estimatedMenuHeight && above > below;

    const viewportWidth = window.innerWidth;
    const viewportRight = Math.max(dropdownGap, viewportWidth - dropdownGap);
    const minWidth = Math.min(rect.width, viewportRight - dropdownGap);
    const left = Math.max(dropdownGap, Math.min(rect.left, viewportRight - minWidth));
    const rightEdge = Math.max(dropdownGap + minWidth, Math.min(rect.right, viewportRight));
    const alignRight = rect.left + rect.width / 2 > viewportWidth / 2;

    return {
      top: opensUpward ? undefined : lowerStart,
      bottom: opensUpward ? window.innerHeight - upperEnd : undefined,
      left: alignRight ? undefined : left,
      right: alignRight ? viewportWidth - rightEdge : undefined,
      minWidth,
      maxWidth: alignRight ? rightEdge - dropdownGap : viewportRight - left,
      maxHeight: opensUpward ? above : below,
    };
  }, [dropdownGap, estimatedOptionHeight, options.length]);

  const [dropdownPosition, setDropdownPosition] = useState<ReturnType<typeof resolveDropdownPosition>>(null);

  useEffect(() => {
    if (!open) return;
    const syncDropdownPosition = () => {
      setDropdownPosition(resolveDropdownPosition());
    };

    syncDropdownPosition();

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement | null;
        if (target?.closest(testId ? `[data-select-menu="${testId}"]` : '[data-select-menu]')) {
          return;
        }
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('scroll', syncDropdownPosition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('scroll', syncDropdownPosition, true);
    };
  }, [open, resolveDropdownPosition, testId]);

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 0, maxWidth: '100%' }}>
      <div data-testid={testId} title={selected?.label ?? value} onClick={() => setOpen(!open)} style={{
        background: '#333', color: '#fff', border: '1px solid #555',
        borderRadius: scalePanelPixels(6, panelScale),
        padding: `${scalePanelPixels(8, panelScale)} ${scalePanelPixels(16, panelScale)}`,
        fontSize: scalePanelPixels(24, panelScale),
        cursor: 'pointer', userSelect: 'none', minWidth: scalePanelPixels(120, panelScale), textAlign: 'center',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {selected?.label ?? value} ▾
      </div>
      {open && dropdownPosition && createPortal(
        <div
          data-select-menu={testId ?? 'custom-select'}
          style={{
            position: 'fixed',
            ...dropdownPosition,
            boxSizing: 'border-box',
            zIndex: 1100,
            background: '#2a2a3a',
            border: `${DROPDOWN_BORDER_PX}px solid #555`,
            borderRadius: scalePanelPixels(6, panelScale),
            overflowX: 'hidden',
            overflowY: 'auto',
            boxShadow: '0 12px 24px rgba(0,0,0,0.32)',
          }}
        >
          {options.map(option => (
            <div key={option.value}
              data-testid={testId ? `${testId}-option-${option.value}` : undefined}
              title={option.label}
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{
                padding: `${scalePanelPixels(12, panelScale)} ${scalePanelPixels(20, panelScale)}`,
                fontSize: scalePanelPixels(24, panelScale), lineHeight: scalePanelPixels(24, panelScale), color: '#fff',
                cursor: 'pointer',
                background: option.value === value ? '#4a4a5a' : 'transparent',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
              onMouseEnter={event => { event.currentTarget.style.background = '#3a3a4a'; }}
              onMouseLeave={event => { event.currentTarget.style.background = option.value === value ? '#4a4a5a' : 'transparent'; }}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body,
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
      overflow: 'visible',
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
