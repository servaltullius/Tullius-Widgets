import { describe, expect, it } from 'vitest';
import type { WidgetBounds } from './widgetBounds';
import { computeResizeScale, snapWidgetMove } from './widgetSnap';

function bounds({
  left,
  top,
  width,
  height,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
}): WidgetBounds {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2),
  };
}

describe('widgetSnap', () => {
  it('snaps moving widgets to nearby left and right edges', () => {
    const result = snapWidgetMove({
      activeId: 'player.level',
      rawX: 94,
      rawY: 205,
      boundsById: {
        'player.level': bounds({ left: 0, top: 200, width: 80, height: 40 }),
        'player.gold': bounds({ left: 100, top: 160, width: 84, height: 60 }),
      },
      snapThreshold: 10,
      grid: 8,
    });

    expect(result.position).toEqual({ x: 100, y: 208 });
    expect(result.guides).toContainEqual({
      orientation: 'vertical',
      position: 100,
      start: 160,
      end: 245,
    });
  });

  it('snaps moving widgets to nearby center lines', () => {
    const result = snapWidgetMove({
      activeId: 'time.game',
      rawX: 43,
      rawY: 198,
      boundsById: {
        'time.game': bounds({ left: 0, top: 0, width: 120, height: 40 }),
        'time.real': bounds({ left: 220, top: 180, width: 120, height: 80 }),
      },
      snapThreshold: 8,
      grid: 10,
    });

    expect(result.position.y).toBe(200);
    expect(result.guides).toContainEqual({
      orientation: 'horizontal',
      position: 220,
      start: 40,
      end: 340,
    });
  });

  it('falls back to grid snapping when no stronger alignment is nearby', () => {
    const result = snapWidgetMove({
      activeId: 'movement.speedMult',
      rawX: 43,
      rawY: 57,
      boundsById: {
        'movement.speedMult': bounds({ left: 0, top: 0, width: 100, height: 32 }),
        'player.level': bounds({ left: 400, top: 300, width: 80, height: 40 }),
      },
      snapThreshold: 6,
      grid: 10,
    });

    expect(result.position).toEqual({ x: 40, y: 60 });
    expect(result.guides).toContainEqual({
      orientation: 'vertical',
      position: 40,
      start: 57,
      end: 89,
    });
    expect(result.guides).toContainEqual({
      orientation: 'horizontal',
      position: 60,
      start: 40,
      end: 140,
    });
  });

  it('allows overlap when the user deliberately drags into another widget', () => {
    const result = snapWidgetMove({
      activeId: 'player.level',
      rawX: 60,
      rawY: 50,
      boundsById: {
        'player.level': bounds({ left: 0, top: 0, width: 80, height: 40 }),
        'player.gold': bounds({ left: 40, top: 40, width: 90, height: 44 }),
      },
      snapThreshold: 0,
      grid: 1,
    });

    expect(result.position).toEqual({ x: 60, y: 50 });
  });

  it('clamps active item resize scale to per-item bounds', () => {
    expect(computeResizeScale({
      originScale: 1,
      originDistance: 100,
      nextDistance: 280,
      minScale: 0.7,
      maxScale: 1.5,
    })).toBe(1.5);

    expect(computeResizeScale({
      originScale: 1,
      originDistance: 100,
      nextDistance: 20,
      minScale: 0.7,
      maxScale: 1.5,
    })).toBe(0.7);
  });
});
