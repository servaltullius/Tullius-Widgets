import { memo } from 'react';
import { iconMap } from '../assets/icons';
import { t } from '../i18n/translations';
import type { Language } from '../types/settings';
import {
  EXPERIENCE_AVATAR_PRESENTATION,
  getExperienceRingStroke,
} from './experiencePresentation';

interface ExperienceWidgetProps {
  currentXp: number;
  totalXp: number;
  level: number;
  visible: boolean;
  lang: Language;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString();
}

export const ExperienceWidget = memo(function ExperienceWidget({
  currentXp,
  totalXp,
  level,
  visible,
  lang,
}: ExperienceWidgetProps) {
  if (!visible) return null;

  const {
    safeCurrentXp,
    safeTotalXp,
    percent,
    radius,
    circumference,
    dashOffset,
    innerMedallionSize,
  } = getExperienceRingStroke(currentXp, totalXp);
  const displayValue = `${formatInteger(safeCurrentXp)} / ${formatInteger(safeTotalXp)}`;
  const safeLevel = Math.max(1, Math.round(level));
  const tooltip = `${t(lang, 'experienceProgress')}: ${displayValue} XP`;
  const experienceIconSrc = iconMap.experience;
  const bottomLine = `${t(lang, 'level')} ${safeLevel} · ${displayValue}`;
  const {
    medallionSize,
    ringThickness,
    ringFillColor,
    ringTrackColor,
    innerBackground,
    innerBorder,
    iconObjectFit,
    iconObjectPosition,
    iconTranslateX,
  } = EXPERIENCE_AVATAR_PRESENTATION;

  return (
    <div
      title={tooltip}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '2px 0',
      }}
    >
      <div
        role="progressbar"
        aria-label={t(lang, 'experienceProgress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        title={tooltip}
        style={{
          width: `${medallionSize}px`,
          height: `${medallionSize}px`,
          borderRadius: '50%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          aria-hidden="true"
          width={medallionSize}
          height={medallionSize}
          viewBox={`0 0 ${medallionSize} ${medallionSize}`}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'visible',
          }}
        >
          <circle
            data-testid="experience-ring-track"
            cx={medallionSize / 2}
            cy={medallionSize / 2}
            r={radius}
            fill="none"
            stroke={ringTrackColor}
            strokeWidth={ringThickness}
          />
          <circle
            data-testid="experience-ring-fill"
            cx={medallionSize / 2}
            cy={medallionSize / 2}
            r={radius}
            fill="none"
            stroke={ringFillColor}
            strokeWidth={ringThickness}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${medallionSize / 2} ${medallionSize / 2})`}
            style={{
              filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.28))',
            }}
          />
        </svg>
        <div
          style={{
            width: `${innerMedallionSize}px`,
            height: `${innerMedallionSize}px`,
            borderRadius: '50%',
            background: innerBackground,
            border: innerBorder,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {experienceIconSrc ? (
            <img
              src={experienceIconSrc}
              alt=""
              aria-hidden="true"
              width={74}
              height={74}
              style={{
                width: '100%',
                height: '100%',
                objectFit: iconObjectFit,
                objectPosition: iconObjectPosition,
                transform: `translateX(${iconTranslateX}px)`,
              }}
            />
          ) : null}
        </div>
      </div>
      <span
        style={{
          color: '#ffffff',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          textShadow: '1px 1px 2px rgba(0,0,0,0.82)',
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {bottomLine}
      </span>
    </div>
  );
});
