import { memo } from 'react';
import { iconMap } from '../assets/icons';

interface ResistanceWidgetProps {
  icon: string;
  iconColor: string;
  value: number | string;
  unit?: string;
  visible: boolean;
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

export const ResistanceWidget = memo(function ResistanceWidget({
  icon,
  iconColor,
  value,
  unit = '',
  visible,
  min,
  cap,
  format,
  secondaryValue,
  secondaryUnit = '',
  secondaryTone = 'neutral',
  tooltip,
}: ResistanceWidgetProps) {
  if (!visible) return null;

  const iconSrc = iconMap[icon];
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
          fontFamily: 'sans-serif',
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
            fontFamily: 'sans-serif',
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
        style={{
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: `drop-shadow(0 0 4px ${iconColor}66)`,
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={icon}
            width={34}
            height={34}
            style={{ objectFit: 'contain', borderRadius: '6px' }}
          />
        ) : null}
      </div>
    </div>
  );
});
