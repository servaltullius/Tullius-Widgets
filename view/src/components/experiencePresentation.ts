function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export const EXPERIENCE_BAR_PRESENTATION = {
  levelMarkSize: 44,
  trackHeight: 4,
  width: 330,
  iconObjectFit: 'contain',
  iconObjectPosition: 'center center',
} as const;

export interface ExperienceProgressPresentation {
  safeCurrentXp: number;
  safeTotalXp: number;
  percent: number;
}

export function getExperienceProgressPresentation(
  currentXp: number,
  totalXp: number,
): ExperienceProgressPresentation {
  const safeCurrentXp = Math.max(0, Math.round(currentXp));
  const safeTotalXp = Math.max(0, Math.round(totalXp));
  const rawPercent = safeTotalXp > 0
    ? (safeCurrentXp / safeTotalXp) * 100
    : safeCurrentXp > 0 ? 100 : 0;

  return {
    safeCurrentXp,
    safeTotalXp,
    percent: Math.round(clampPercent(rawPercent)),
  };
}
