import { useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PanelPortalContext } from './panelPortal';
import { claimEscape } from '../../utils/escapeOwners';
import { isHotkeyCaptureActive } from '../../utils/hotkeys';

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

// Keys that open a closed menu from its focused trigger. Once open, the menu answers the keys itself.
// While a widget is selected its arrow-key nudge comes first, so there Enter or Space opens the menu.
const SELECT_OPEN_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', ' ']);

export function CustomSelect({ value, options, onChange, panelScale = 1, testId }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  // The option the arrow keys and the pointer point at; Enter or Space picks it. Kept by value so
  // it stays on the same option when the list changes while open (user fonts arriving, say); the
  // index is the fallback once that option is gone. `scroll` counts key moves, so a key brings
  // the option back into view even when it was already the active one (after a wheel scroll).
  const [active, setActive] = useState<{ value: string | null; index: number; scroll: number }>(
    { value: null, index: 0, scroll: 0 },
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  const selectedIndex = options.findIndex(option => option.value === value);
  const lastIndex = options.length - 1;
  const activeValueIndex = active.value === null ? -1 : options.findIndex(option => option.value === active.value);
  const activeOption = !open || lastIndex < 0
    ? -1
    : activeValueIndex >= 0 ? activeValueIndex : Math.min(Math.max(0, active.index), lastIndex);
  const optionId = (index: number) => `${menuId}-option-${index}`;

  const pointAt = (list: readonly SelectOption[], index: number, fromKey: boolean) => {
    setActive(current => ({
      value: list[index]?.value ?? null,
      index,
      scroll: fromKey ? current.scroll + 1 : current.scroll,
    }));
  };

  const openMenu = () => {
    pointAt(options, Math.max(0, selectedIndex), true);
    setOpen(true);
  };

  const latestRef = useRef({ options, onChange, activeOption, lastIndex });
  useEffect(() => {
    latestRef.current = { options, onChange, activeOption, lastIndex };
  });

  // While open the menu takes the arrow keys, Home, End, Enter and Space wherever the focus is (a
  // mouse click may not leave it on the trigger), ahead of the widget arrow-key nudge. Tab closes it
  // and moves on as usual; Esc is answered through the claim above.
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      // A hotkey button waiting for a key takes every key; the menu leaves them to it.
      if (isHotkeyCaptureActive()) return;
      const latest = latestRef.current;
      let next: number | null = null;
      if (event.key === 'ArrowDown') next = Math.min(latest.lastIndex, latest.activeOption + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, latest.activeOption - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = latest.lastIndex;
      else if (event.key === 'Tab') {
        setOpen(false);
        return;
      } else if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (next !== null) {
        pointAt(latest.options, next, true);
        return;
      }
      if (event.repeat) return;
      const picked = latest.options[latest.activeOption];
      if (picked) latest.onChange(picked.value);
      setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);

  // Keeps the active option in view when the keys move it past the menu's scrolled edge, and shows
  // the chosen one when the menu first appears. Not tied to the menu's position, which is set again
  // on every scroll (the menu's own included), so wheel scrolling is not pulled back.
  const menuShown = open && dropdownPosition !== null;
  useEffect(() => {
    if (!menuShown) return;
    const menu = menuRef.current;
    if (!menu || activeOption < 0) return;
    const option = menu.querySelector<HTMLElement>(`[data-option-index="${activeOption}"]`);
    if (!option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }, [activeOption, menuShown, active.scroll]);

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
        aria-activedescendant={activeOption >= 0 ? optionId(activeOption) : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={event => {
          // Handled here rather than left to the button's click, so Space does not also click on
          // key release and close the menu it just opened.
          if (open || event.altKey || event.ctrlKey || event.metaKey || !SELECT_OPEN_KEYS.has(event.key)) return;
          if (isHotkeyCaptureActive()) return;
          event.preventDefault();
          if (!event.repeat) openMenu();
        }}
      >
        <span className="tw-p-select-value">{selected?.label ?? value}</span>
        <span className="tw-p-select-caret" aria-hidden="true">▾</span>
      </button>
      {open && dropdownPosition && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          className="tw-p-menu"
          data-select-menu={testId ?? 'custom-select'}
          style={{ ...dropdownPosition, overflowX: 'hidden', overflowY: 'auto' }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              className="tw-p-option"
              data-option-index={index}
              data-active={index === activeOption ? 'true' : undefined}
              data-testid={testId ? `${testId}-option-${option.value}` : undefined}
              title={option.label}
              // Move rather than enter, so a list scrolled by the keys under a resting pointer does
              // not snap the active option back to it.
              onMouseMove={() => { if (index !== activeOption) pointAt(options, index, false); }}
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
