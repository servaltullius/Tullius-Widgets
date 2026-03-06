import { describe, expect, it } from 'vitest';
import { getWidgetDefaultPositions } from './widgetRegistry';

describe('getWidgetDefaultPositions', () => {
  it('wraps lower-priority groups into a second column on shorter viewports', () => {
    const positions = getWidgetDefaultPositions(1920, 1080, 'medium');

    expect(positions.time).toEqual({ x: 20, y: 20 });
    expect(positions.playerInfo.x).toBeGreaterThan(positions.time.x);
    expect(positions.defense.x).toBeLessThan(positions.playerInfo.x);
    expect(positions.defense.y).toBe(20);
    expect(positions.timedEffects.x).toBe(positions.defense.x);
  });

  it('keeps the main widget stack in a single column on very tall viewports', () => {
    const positions = getWidgetDefaultPositions(1920, 2200, 'medium');

    expect(positions.time).toEqual({ x: 20, y: 20 });
    expect(positions.playerInfo.x).toBe(positions.experience.x);
    expect(positions.playerInfo.x).toBe(positions.movement.x);
    expect(positions.movement.y).toBeGreaterThan(positions.timedEffects.y);
  });

  it('falls back to a single safe column on narrow viewports', () => {
    const positions = getWidgetDefaultPositions(700, 1080, 'medium');

    expect(positions.time.x).toBe(positions.playerInfo.x);
    expect(positions.playerInfo.y).toBeGreaterThan(positions.time.y);
    expect(positions.defense.x).toBe(positions.playerInfo.x);
  });

  it('accounts for larger horizontal layouts when deciding default columns', () => {
    const positions = getWidgetDefaultPositions(1600, 1200, 'large', {
      playerInfo: 'horizontal',
      resistances: 'horizontal',
      offense: 'horizontal',
    });

    expect(positions.time.x).toBe(positions.playerInfo.x);
    expect(positions.playerInfo.y).toBeGreaterThan(positions.time.y);
    expect(positions.resistances.x).toBe(positions.playerInfo.x);
  });
});
