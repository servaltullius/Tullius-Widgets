import { memo } from 'react';
import { iconMap } from '../assets/icons';
import { standardStatIconMap } from '../data/standardStatIcons';
import type { IconTheme } from '../types/settings';

interface ResistanceWidgetProps {
  icon: string;
  iconColor: string;
  value: number | string;
  unit?: string;
  visible: boolean;
  iconTheme?: IconTheme;
  min?: number;
  cap?: number;
  format?: (value: number) => string;
  secondaryValue?: number | string;
  secondaryUnit?: string;
  secondaryTone?: 'neutral' | 'warning';
  tooltip?: string;
}

function resolveValueColor(isAtCap: boolean, isNegative: boolean): string {
  if (isAtCap) return '#ffd700';
  if (isNegative) return '#ff8d8d';
  return '#ffffff';
}

function formatDisplayValue(
  value: number | string,
  unit: string,
  min?: number,
  cap?: number,
  format?: (value: number) => string,
): string {
  if (typeof value !== 'number') {
    return `${value}${unit}`;
  }

  let displayValue = value;
  if (min !== undefined) displayValue = Math.max(displayValue, min);
  if (cap !== undefined) displayValue = Math.min(displayValue, cap);
  return `${format ? format(displayValue) : Math.round(displayValue).toString()}${unit}`;
}

export const ResistanceWidget = memo(function ResistanceWidget(props: ResistanceWidgetProps) {
  const {
    icon,
    value,
    unit = '',
    visible,
    iconTheme = 'standard',
    min,
    cap,
    format,
    secondaryValue,
    secondaryUnit = '',
    secondaryTone = 'neutral',
    tooltip,
  } = props;
  if (!visible) return null;

  const iconSrc = iconTheme === 'dororong' ? iconMap[icon] : undefined;
  const StandardIcon = standardStatIconMap[icon];
  const primaryDisplayValue = formatDisplayValue(value, unit, min, cap, format);
  const secondaryDisplayValue = secondaryValue === undefined
    ? null
    : formatDisplayValue(secondaryValue, secondaryUnit, undefined, undefined, format);
  const isAtCap = typeof value === 'number' && cap !== undefined && value >= cap;
  const isNegative = typeof value === 'number' && value < 0;
  const secondaryColor = secondaryTone === 'warning' ? '#ffcf7a' : '#aeb8c6';

  return (
    <div
      data-resistance-widget="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '2px',
        minWidth: '52px',
        padding: '2px 0',
      }}
      title={tooltip}
    >
      <span
        data-resistance-primary="true"
        style={{
          color: resolveValueColor(isAtCap, isNegative),
          fontFamily: 'var(--tw-font-hud)',
          fontSize: '18px',
          fontWeight: 700,
          lineHeight: 1,
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {primaryDisplayValue}
      </span>
      {secondaryDisplayValue && (
        <span
          data-resistance-secondary="true"
          style={{
            color: secondaryColor,
            fontFamily: 'var(--tw-font-hud)',
            fontSize: '10px',
            fontWeight: 600,
            lineHeight: 1,
            textShadow: '1px 1px 2px rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            opacity: 0.95,
          }}
        >
          {secondaryDisplayValue}
        </span>
      )}
      <div
        data-resistance-icon="true"
        data-icon-theme={iconTheme}
        style={{
          position: 'relative',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: iconSrc ? 'none' : `drop-shadow(0 0 3px ${props.iconColor}66)`,
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            style={{
              position: 'absolute',
              left: '-4px',
              top: '-4px',
              width: '42px',
              height: '42px',
              display: 'block',
              objectFit: 'contain',
              borderRadius: '6px',
            }}
          />
        ) : StandardIcon ? (
          <div
            data-resistance-icon-fallback="true"
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(24, 30, 42, 0.98) 0%, rgba(7, 9, 16, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.72)',
              boxShadow: `0 0 0 1px ${props.iconColor}80, 0 3px 8px rgba(0, 0, 0, 0.58)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '2px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, ${props.iconColor}8c 0%, ${props.iconColor}2e 58%, rgba(0, 0, 0, 0) 100%)`,
              }}
            />
            <StandardIcon
              size={20}
              color="#ffffff"
              strokeWidth={2.2}
              style={{ position: 'relative', filter: `drop-shadow(0 0 2px ${props.iconColor}b8) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.95))` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});
