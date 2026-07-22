import { describe, expect, it } from 'vitest';
import {
  EXPERIENCE_AVATAR_PRESENTATION,
  getExperienceRingStroke,
} from './experiencePresentation';

describe('experiencePresentation', () => {
  it('exposes the tuned avatar framing constants in one place', () => {
    expect(EXPERIENCE_AVATAR_PRESENTATION).toMatchObject({
      medallionSize: 94,
      ringThickness: 6,
      ringFillColor: '#ffffff',
      ringTrackColor: 'rgba(255, 255, 255, 0.22)',
      iconObjectFit: 'contain',
      iconObjectPosition: 'center center',
    });
    expect('iconTranslateX' in EXPERIENCE_AVATAR_PRESENTATION).toBe(false);
  });

  it('computes clamped svg ring geometry for experience progress', () => {
    const partial = getExperienceRingStroke(208, 320);
    expect(partial.percent).toBe(65);
    expect(partial.dashOffset).toBeGreaterThan(0);
    expect(partial.dashOffset).toBeLessThan(partial.circumference);

    const overfilled = getExperienceRingStroke(400, 320);
    expect(overfilled.percent).toBe(100);
    expect(overfilled.dashOffset).toBeCloseTo(0, 3);

    const empty = getExperienceRingStroke(0, 0);
    expect(empty.percent).toBe(0);
    expect(empty.dashOffset).toBeCloseTo(empty.circumference, 3);
  });
});
