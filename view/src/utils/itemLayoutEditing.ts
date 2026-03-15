import {
  WIDGET_ITEM_IDS,
  buildItemLayoutsFromLegacySettings,
  getWidgetItemDefaultZIndex,
} from '../data/widgetItemRegistry';
import type { WidgetItemLayout, WidgetSettings } from '../types/settings';

function getStableItemOrder(itemId: string): number {
  return WIDGET_ITEM_IDS.indexOf(itemId);
}

export function sortItemIdsByZIndex(
  itemLayouts: Record<string, WidgetItemLayout>,
  itemIds = WIDGET_ITEM_IDS,
): string[] {
  return [...itemIds].sort((leftId, rightId) => {
    const leftLayout = itemLayouts[leftId];
    const rightLayout = itemLayouts[rightId];
    const leftZ = leftLayout?.zIndex ?? getWidgetItemDefaultZIndex(leftId);
    const rightZ = rightLayout?.zIndex ?? getWidgetItemDefaultZIndex(rightId);

    if (leftZ !== rightZ) {
      return leftZ - rightZ;
    }

    return getStableItemOrder(leftId) - getStableItemOrder(rightId);
  });
}

function assignOrderedZIndices(
  itemLayouts: Record<string, WidgetItemLayout>,
  orderedItemIds: string[],
): Record<string, WidgetItemLayout> {
  let changed = false;
  const nextLayouts = { ...itemLayouts };

  orderedItemIds.forEach((itemId, zIndex) => {
    const currentLayout = itemLayouts[itemId];
    if (!currentLayout) {
      return;
    }

    if (currentLayout.zIndex === zIndex) {
      return;
    }

    changed = true;
    nextLayouts[itemId] = {
      ...currentLayout,
      zIndex,
    };
  });

  return changed ? nextLayouts : itemLayouts;
}

export function normalizeItemLayoutZIndices(
  itemLayouts: Record<string, WidgetItemLayout>,
): Record<string, WidgetItemLayout> {
  return assignOrderedZIndices(itemLayouts, sortItemIdsByZIndex(itemLayouts));
}

function reorderVisibleItem(
  itemLayouts: Record<string, WidgetItemLayout>,
  itemId: string,
  direction: 'forward' | 'backward',
): Record<string, WidgetItemLayout> {
  const currentLayout = itemLayouts[itemId];
  if (!currentLayout?.visible) {
    return itemLayouts;
  }

  const orderedItemIds = sortItemIdsByZIndex(itemLayouts);
  const visibleItemIds = orderedItemIds.filter(currentItemId => itemLayouts[currentItemId]?.visible);
  const currentIndex = visibleItemIds.indexOf(itemId);
  if (currentIndex < 0) {
    return itemLayouts;
  }

  const swapIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
  if (swapIndex < 0 || swapIndex >= visibleItemIds.length) {
    return itemLayouts;
  }

  const reorderedVisibleIds = [...visibleItemIds];
  [reorderedVisibleIds[currentIndex], reorderedVisibleIds[swapIndex]] = [
    reorderedVisibleIds[swapIndex],
    reorderedVisibleIds[currentIndex],
  ];

  let visibleCursor = 0;
  const mergedOrder = orderedItemIds.map(currentItemId => {
    if (!itemLayouts[currentItemId]?.visible) {
      return currentItemId;
    }

    const nextVisibleId = reorderedVisibleIds[visibleCursor];
    visibleCursor += 1;
    return nextVisibleId;
  });

  return assignOrderedZIndices(itemLayouts, mergedOrder);
}

export function bringVisibleItemForward(
  itemLayouts: Record<string, WidgetItemLayout>,
  itemId: string,
): Record<string, WidgetItemLayout> {
  return reorderVisibleItem(itemLayouts, itemId, 'forward');
}

export function sendVisibleItemBackward(
  itemLayouts: Record<string, WidgetItemLayout>,
  itemId: string,
): Record<string, WidgetItemLayout> {
  return reorderVisibleItem(itemLayouts, itemId, 'backward');
}

export function resetItemToDefaultPlacement(params: {
  itemId: string;
  itemLayouts: Record<string, WidgetItemLayout>;
  settings: WidgetSettings;
  viewportWidth: number;
  viewportHeight: number;
}): Record<string, WidgetItemLayout> {
  const {
    itemId,
    itemLayouts,
    settings,
    viewportWidth,
    viewportHeight,
  } = params;
  const currentLayout = itemLayouts[itemId];
  if (!currentLayout) {
    return itemLayouts;
  }

  const defaultLayouts = buildItemLayoutsFromLegacySettings({
    general: settings.general,
    resistances: settings.resistances,
    defense: settings.defense,
    offense: settings.offense,
    equipped: settings.equipped,
    timedEffects: settings.timedEffects,
    movement: settings.movement,
    time: settings.time,
    experience: settings.experience,
    playerInfo: settings.playerInfo,
    positions: {},
    layouts: settings.layouts,
    groupScales: {},
  }, viewportWidth, viewportHeight);
  const defaultLayout = defaultLayouts[itemId];
  if (!defaultLayout) {
    return itemLayouts;
  }

  if (currentLayout.x === defaultLayout.x && currentLayout.y === defaultLayout.y) {
    return itemLayouts;
  }

  return {
    ...itemLayouts,
    [itemId]: {
      ...currentLayout,
      x: defaultLayout.x,
      y: defaultLayout.y,
    },
  };
}

export function nudgeItemLayout(
  itemLayouts: Record<string, WidgetItemLayout>,
  itemId: string,
  deltaX: number,
  deltaY: number,
): Record<string, WidgetItemLayout> {
  const currentLayout = itemLayouts[itemId];
  if (!currentLayout || (deltaX === 0 && deltaY === 0)) {
    return itemLayouts;
  }

  return {
    ...itemLayouts,
    [itemId]: {
      ...currentLayout,
      x: currentLayout.x + deltaX,
      y: currentLayout.y + deltaY,
    },
  };
}
