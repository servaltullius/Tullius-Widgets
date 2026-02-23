import type { GroupPosition } from '../types/settings';

export const WIDGET_GROUP_IDS = [
  'experience',
  'playerInfo',
  'resistances',
  'defense',
  'offense',
  'equipped',
  'time',
  'timedEffects',
  'movement',
] as const;

export type WidgetGroupId = (typeof WIDGET_GROUP_IDS)[number];

export const COMBAT_WIDGET_GROUP_IDS = [
  'experience',
  'playerInfo',
  'resistances',
  'defense',
  'offense',
  'equipped',
  'movement',
] as const satisfies readonly WidgetGroupId[];

export const EFFECT_WIDGET_GROUP_IDS = [
  'time',
  'timedEffects',
] as const satisfies readonly WidgetGroupId[];

export function getWidgetDefaultPositions(viewportWidth: number): Record<WidgetGroupId, GroupPosition> {
  const right = viewportWidth - 260;
  return {
    playerInfo: { x: right, y: 20 },
    experience: { x: right, y: 180 },
    time: { x: 20, y: 20 },
    resistances: { x: right, y: 220 },
    defense: { x: right, y: 500 },
    offense: { x: right, y: 630 },
    equipped: { x: right, y: 760 },
    timedEffects: { x: right, y: 900 },
    movement: { x: right, y: 1030 },
  };
}
