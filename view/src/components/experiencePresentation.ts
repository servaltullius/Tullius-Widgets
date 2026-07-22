const RING_FILL_COLOR = '#ffffff';
const RING_TRACK_COLOR = 'rgba(255, 255, 255, 0.22)';

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export const EXPERIENCE_AVATAR_PRESENTATION = {
  medallionSize: 94,
  ringThickness: 6,
  ringFillColor: RING_FILL_COLOR,
  ringTrackColor: RING_TRACK_COLOR,
  innerBackground: 'radial-gradient(circle at 35% 30%, rgba(36, 40, 52, 0.9), rgba(10, 12, 18, 0.95))',
  innerBorder: '1px solid rgba(255, 255, 255, 0.18)',
  iconObjectFit: 'contain',
  iconObjectPosition: 'center center',
} as const;

export interface ExperienceRingStroke {
  safeCurrentXp: number;
  safeTotalXp: number;
  percent: number;
  radius: number;
  circumference: number;
  dashOffset: number;
  innerMedallionSize: number;
}

export function getExperienceRingStroke(currentXp: number, totalXp: number): ExperienceRingStroke {
  const safeCurrentXp = Math.max(0, Math.round(currentXp));
  const safeTotalXp = Math.max(0, Math.round(totalXp));
  const rawPercent = safeTotalXp > 0 ? (safeCurrentXp / safeTotalXp) * 100 : safeCurrentXp > 0 ? 100 : 0;
  const percent = Math.round(clampPercent(rawPercent));
  const radius = (EXPERIENCE_AVATAR_PRESENTATION.medallionSize - EXPERIENCE_AVATAR_PRESENTATION.ringThickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - (percent / 100));
  const innerMedallionSize = EXPERIENCE_AVATAR_PRESENTATION.medallionSize
    - (EXPERIENCE_AVATAR_PRESENTATION.ringThickness * 2);

  return {
    safeCurrentXp,
    safeTotalXp,
    percent,
    radius,
    circumference,
    dashOffset,
    innerMedallionSize,
  };
}
