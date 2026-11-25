import { useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PanelPortalContext } from './panelPortal';
import { claimEscape } from '../../utils/escapeOwners';

export interface SelectOption {
  value: string;
  label: string;
}

interface SettingRowProps {
  label: ReactNode;
  help?: ReactNode;
  children: ReactNode;
}

// One setting: label on the left, its control on the right, and optional help below across the
// full width so long explanations do not squeeze into the label column.
export function SettingRow({ label, help, children }: SettingRowProps) {
  return (
    <div className="tw-p-row">
      <div className="tw-p-label">{label}</div>
      {children}
      {help && <p className="tw-p-help tw-p-row-help">{help}</p>}
    </div>
  );
}

export function GroupTitle({ children }: { children: ReactNode }) {
  return <h3 className="tw-p-group-title">{children}</h3>;
}

export function Note({ children, tone, testId }: { children: ReactNode; tone?: 'warn' | 'good'; testId?: string }) {
  return <p className={tone ? `tw-p-note tw-p-help is-${tone}` : 'tw-p-note'} data-testid={testId}>{children}</p>;
}

export function SubSettings({ children }: { children: ReactNode }) {
  return <div className="tw-p-sub">{children}</div>;
}

export interface ToggleProps {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  help?: ReactNode;
}

// The whole row is the label, so clicking the text toggles once; the checkbox stays in the layout
// (visually hidden) to keep keyboard focus and screen-reader state.
export function Toggle({ label, checked, onChange, help }: ToggleProps) {
  return (
    <label className="tw-p-row tw-p-toggle-row">
      <span className="tw-p-label">{label}</span>
      <span className="tw-p-switch">
        <input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
        <span className="tw-p-switch-track" aria-hidden="true" />
      </span>
      {help && <span className="tw-p-help tw-p-row-help">{help}</span>}
    </label>
  );
}

interface SegmentedProps {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  testId?: string;
}

// For two or three short choices. Arrow keys move the choice like a radio group.
export function Segmented({ value, options, onChange, ariaLabel, testId }: SegmentedProps) {
  // Arrow keys move the choice and the keyboard focus together, like a native radio group.
  const moveBy = (group: HTMLElement, step: number) => {
    const index = options.findIndex(option => option.value === value);
    const nextIndex = (Math.max(0, index) + step + options.length) % options.length;
    const next = options[nextIndex];
    if (!next || next.value === value) return;
    onChange(next.value);
    group.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };
  return (
    <div
      className="tw-p-seg"
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveBy(event.currentTarget, 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveBy(event.currentTarget, -1);
        }
      }}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          data-testid={testId ? `${testId}-option-${option.value}` : undefined}
          // Picking the current option again is passed on too: after a failed save it saves again.
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface SelectRowProps {
  label: ReactNode;
  help?: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  panelScale?: number;
  testId?: string;
  variant?: 'select' | 'segmented';
}

export function SelectRow({ label, help, value, options, onChange, panelScale = 1, testId, variant = 'select' }: SelectRowProps) {
  return (
    <SettingRow label={label} help={help}>
      {variant === 'segmented'
        ? <Segmented value={value} options={options} onChange={onChange} ariaLabel={typeof label === 'string' ? label : undefined} testId={testId} />
        : <CustomSelect value={value} options={options} onChange={onChange} panelScale={panelScale} testId={testId} />}
    </SettingRow>
  );
}

interface SliderRowProps {
  label: ReactNode;
  help?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  testId?: string;
}

// The callbacks and limits pass through unchanged; only the look is shared.
export function SliderRow({ label, help, value, min, max, step = 1, onChange, formatValue, testId }: SliderRowProps) {
  const span = max - min;
  const fill = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  return (
    <SettingRow label={label} help={help}>
      <span className="tw-p-slider">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          data-testid={testId}
          aria-label={typeof label === 'string' ? label : undefined}
          style={{ '--fill': `${fill}%` } as CSSProperties}
          onChange={event => onChange(Number(event.target.value))}
        />
        <span className="tw-p-slider-value">{formatValue ? formatValue(value) : value}</span>
      </span>
    </SettingRow>
  );
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  panelScale?: number;
  testId?: string;
}

const DROPDOWN_GAP_PX = 4;
const DROPDOWN_OPTION_HEIGHT_PX = 38;
const DROPDOWN_CHROME_PX = 10;

export function CustomSelect({ value, options, onChange, panelScale = 1, testId }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalTarget = useContext(PanelPortalContext);
  const menuId = useId();
  const selected = options.find(option => option.value === value);
  const dropdownGap = DROPDOWN_GAP_PX * panelScale;
  const estimatedOptionHeight = DROPDOWN_OPTION_HEIGHT_PX * panelScale;

  const resolveDropdownPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const estimatedMenuHeight = options.length * estimatedOptionHeight + DROPDOWN_CHROME_PX * panelScale;
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
  }, [dropdownGap, estimatedOptionHeight, options.length, panelScale]);

  const [dropdownPosition, setDropdownPosition] = useState<ReturnType<typeof resolveDropdownPosition>>(null);

  // An open menu owns Esc: it closes the menu only, not the widget selection or the panel. Kept
  // apart from the positioning below so re-renders that move the menu do not re-claim the key.
  useEffect(() => (open ? claimEscape('selectMenu', () => setOpen(false)) : undefined), [open]);

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
    // Capture phase: a widget's resize handle stops the press from bubbling, and the menu must
    // still close when the card it belongs to is hidden for the drag.
    document.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('scroll', syncDropdownPosition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('scroll', syncDropdownPosition, true);
    };
  }, [open, resolveDropdownPosition, testId]);

  return (
    <div ref={containerRef} className="tw-p-select">
      <button
        type="button"
        className="tw-p-select-trigger"
        data-testid={testId}
        title={selected?.label ?? value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="tw-p-select-value">{selected?.label ?? value}</span>
        <span className="tw-p-select-caret" aria-hidden="true">▾</span>
      </button>
      {open && dropdownPosition && createPortal(
        <div
          id={menuId}
          role="listbox"
          className="tw-p-menu"
          data-select-menu={testId ?? 'custom-select'}
          style={{ ...dropdownPosition, overflowX: 'hidden', overflowY: 'auto' }}
        >
          {options.map(option => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className="tw-p-option"
              data-testid={testId ? `${testId}-option-${option.value}` : undefined}
              title={option.label}
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {option.label}
            </div>
          ))}
        </div>,
        portalTarget ?? document.body,
      )}
    </div>
  );
}

interface SettingsSectionProps {
  id: string;
  title: string;
  /** Categories show only some sections; a hidden section renders nothing. */
  shown?: boolean;
  children: ReactNode;
}

// A titled group of rows inside a settings category. When a category holds a single section its
// title repeats the category heading, so the stylesheet hides it in that case.
export function SettingsSection({ id, title, shown = true, children }: SettingsSectionProps) {
  if (!shown) return null;
  return (
    <section className="tw-p-section" data-section-id={id}>
      <h3 className="tw-p-group-title">{title}</h3>
      <div className="tw-p-section-body">{children}</div>
    </section>
  );
}
