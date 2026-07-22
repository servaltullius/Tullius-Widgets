import { describe, expect, it } from 'vitest';
import {
  EXPERIENCE_BAR_PRESENTATION,
  getExperienceProgressPresentation,
} from './experiencePresentation';

describe('experiencePresentation', () => {
  it('exposes the compact horizontal progression constants in one place', () => {
    expect(EXPERIENCE_BAR_PRESENTATION).toEqual({
      levelMarkSize: 44,
      trackHeight: 4,
      width: 330,
      iconObjectFit: 'contain',
      iconObjectPosition: 'center center',
    });
  });

  it('computes clamped experience bar progress', () => {
    expect(getExperienceProgressPresentation(208, 320)).toEqual({
      safeCurrentXp: 208,
      safeTotalXp: 320,
      percent: 65,
    });
    expect(getExperienceProgressPresentation(400, 320).percent).toBe(100);
    expect(getExperienceProgressPresentation(0, 0).percent).toBe(0);
  });
});
