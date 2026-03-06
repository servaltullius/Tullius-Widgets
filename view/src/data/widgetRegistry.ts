import type { GroupPosition, WidgetLayout, WidgetSize } from '../types/settings';

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

const TOP_MARGIN = 20;
const LEFT_MARGIN = 20;
const RIGHT_MARGIN = 20;
const BOTTOM_MARGIN = 80;
const COLUMN_GAP = 28;
const GROUP_GAP = 18;

// Keep in sync with DraggableWidgetGroup scaleMap.
const SIZE_SCALE_MAP: Record<WidgetSize, number> = {
  xsmall: 0.85,
  small: 1.0,
  medium: 1.3,
  large: 1.6,
};

const STACKED_GROUP_ORDER: readonly WidgetGroupId[] = [
  'playerInfo',
  'experience',
  'resistances',
  'defense',
  'offense',
  'equipped',
  'timedEffects',
  'movement',
];

const BASE_GROUP_DIMENSIONS: Record<WidgetGroupId, {
  vertical: { width: number; height: number };
  horizontal: { width: number; height: number };
}> = {
  playerInfo: {
    vertical: { width: 304, height: 280 },
    horizontal: { width: 756, height: 88 },
  },
  experience: {
    vertical: { width: 360, height: 92 },
    horizontal: { width: 360, height: 92 },
  },
  resistances: {
    vertical: { width: 304, height: 252 },
    horizontal: { width: 864, height: 88 },
  },
  defense: {
    vertical: { width: 304, height: 110 },
    horizontal: { width: 452, height: 88 },
  },
  offense: {
    vertical: { width: 304, height: 120 },
    horizontal: { width: 596, height: 88 },
  },
  equipped: {
    vertical: { width: 304, height: 96 },
    horizontal: { width: 504, height: 88 },
  },
  time: {
    vertical: { width: 304, height: 96 },
    horizontal: { width: 504, height: 88 },
  },
  timedEffects: {
    vertical: { width: 324, height: 250 },
    horizontal: { width: 324, height: 250 },
  },
  movement: {
    vertical: { width: 304, height: 64 },
    horizontal: { width: 304, height: 64 },
  },
};

function estimateGroupDimensions(
  groupId: WidgetGroupId,
  size: WidgetSize,
  layout: WidgetLayout,
): { width: number; height: number } {
  const scale = SIZE_SCALE_MAP[size];
  const base = BASE_GROUP_DIMENSIONS[groupId][layout];
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
  };
}

function getColumnAnchors(viewportWidth: number, columnWidth: number): number[] {
  const right = Math.max(LEFT_MARGIN, viewportWidth - columnWidth - RIGHT_MARGIN);
  const canUseTwoColumns =
    viewportWidth >= (columnWidth * 2) + COLUMN_GAP + LEFT_MARGIN + RIGHT_MARGIN;

  if (!canUseTwoColumns) {
    return [right];
  }

  const secondary = Math.max(LEFT_MARGIN, right - columnWidth - COLUMN_GAP);
  return [right, secondary];
}

function getViewportBottomLimit(viewportHeight: number): number {
  return Math.max(TOP_MARGIN + 240, viewportHeight - BOTTOM_MARGIN);
}

export function getWidgetDefaultPositions(
  viewportWidth: number,
  viewportHeight: number,
  size: WidgetSize = 'medium',
  layouts: Record<string, WidgetLayout> = {},
): Record<WidgetGroupId, GroupPosition> {
  const estimatedDimensions = Object.fromEntries(
    WIDGET_GROUP_IDS.map(groupId => {
      const layout = layouts[groupId] ?? 'vertical';
      return [groupId, estimateGroupDimensions(groupId, size, layout)];
    }),
  ) as Record<WidgetGroupId, { width: number; height: number }>;

  const stackedColumnWidth = STACKED_GROUP_ORDER.reduce((maxWidth, groupId) => {
    return Math.max(maxWidth, estimatedDimensions[groupId].width);
  }, 0);
  const columnAnchors = getColumnAnchors(viewportWidth, stackedColumnWidth);
  const bottomLimit = getViewportBottomLimit(viewportHeight);
  const positions = {} as Record<WidgetGroupId, GroupPosition>;
  const singleColumnMode = columnAnchors.length === 1;

  let columnIndex = 0;
  let currentY = TOP_MARGIN;

  if (singleColumnMode) {
    positions.time = { x: columnAnchors[0], y: TOP_MARGIN };
    currentY = TOP_MARGIN + estimatedDimensions.time.height + GROUP_GAP;
  } else {
    positions.time = { x: LEFT_MARGIN, y: TOP_MARGIN };
  }

  for (const groupId of STACKED_GROUP_ORDER) {
    const estimatedHeight = estimatedDimensions[groupId].height;
    const nextY = currentY === TOP_MARGIN ? currentY : currentY + GROUP_GAP;
    const wouldOverflow = nextY + estimatedHeight > bottomLimit;

    if (!singleColumnMode && wouldOverflow && columnIndex < columnAnchors.length - 1) {
      columnIndex += 1;
      currentY = TOP_MARGIN;
    }

    const finalY = currentY === TOP_MARGIN ? currentY : currentY + GROUP_GAP;
    positions[groupId] = {
      x: columnAnchors[columnIndex],
      y: finalY,
    };
    currentY = finalY + estimatedHeight;
  }

  return positions;
}
