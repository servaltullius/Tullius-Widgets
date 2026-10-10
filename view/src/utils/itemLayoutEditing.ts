import {
  COMPACT_EFFECT_COLUMN_WIDTH,
  COMPACT_EFFECT_ROW_WIDTH,
  WIDGET_ITEM_IDS,
  resolveWidgetItemLayouts,
  getWidgetItemDefaultZIndex,
} from '../data/widgetItemRegistry';
import type { HudStyle, LayoutSlot, WidgetItemLayout, WidgetSettings } from '../types/settings';

function stampLayoutViewport(
  layout: WidgetItemLayout,
  viewportWidth: number,
  viewportHeight: number,
): WidgetItemLayout {
  return {
    ...layout,
    viewportWidth,
    viewportHeight,
  };
}

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

  const defaultLayouts = resolveWidgetItemLayouts({
    settings: {
      ...settings,
      positions: {},
      layouts: {},
      groupScales: {},
      itemLayouts: {},
    },
    viewportWidth,
    viewportHeight,
  });
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
      ...stampLayoutViewport(currentLayout, viewportWidth, viewportHeight),
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
  viewportWidth: number,
  viewportHeight: number,
): Record<string, WidgetItemLayout> {
  const currentLayout = itemLayouts[itemId];
  if (!currentLayout || (deltaX === 0 && deltaY === 0)) {
    return itemLayouts;
  }

  return {
    ...itemLayouts,
    [itemId]: {
      ...stampLayoutViewport(currentLayout, viewportWidth, viewportHeight),
      x: currentLayout.x + deltaX,
      y: currentLayout.y + deltaY,
    },
  };
}

// Switching HUD style moves every item to that style's default placement but keeps which
// items the player chose to show.
export function buildItemLayoutsForHudStyle(
  settings: WidgetSettings,
  hudStyle: HudStyle,
): Record<string, WidgetItemLayout> {
  const baseline = { width: 1920, height: 1080 };
  const current = resolveWidgetItemLayouts({ settings, viewportWidth: baseline.width, viewportHeight: baseline.height });
  const target = resolveWidgetItemLayouts({
    settings: {
      ...settings,
      general: { ...settings.general, hudStyle },
      positions: {},
      layouts: {},
      groupScales: {},
      itemLayouts: {},
    },
    viewportWidth: baseline.width,
    viewportHeight: baseline.height,
  });

  return Object.fromEntries(
    Object.entries(target).map(([itemId, layout]) => [
      itemId,
      {
        ...layout,
        visible: current[itemId]?.visible ?? layout.visible,
        viewportWidth: baseline.width,
        viewportHeight: baseline.height,
      },
    ]),
  );
}

// Snapshot of the arrangement the player currently sees, stamped with the current screen size
// so loading it on the same screen restores it exactly (any resolution or aspect ratio).
export function captureLayoutSlot(
  settings: WidgetSettings,
  savedAt: number,
  viewport: { width: number; height: number },
): LayoutSlot {
  const baseline = { width: Math.round(viewport.width), height: Math.round(viewport.height) };
  const resolved = resolveWidgetItemLayouts({ settings, viewportWidth: baseline.width, viewportHeight: baseline.height });
  return {
    savedAt,
    hudStyle: settings.general.hudStyle,
    compactAnchor: settings.general.compactAnchor,
    itemLayouts: Object.fromEntries(
      Object.entries(resolved).map(([itemId, layout]) => [
        itemId,
        { ...layout, viewportWidth: baseline.width, viewportHeight: baseline.height },
      ]),
    ),
  };
}

// In a right-hand compact corner the effect list hugs the right edge; switching between the
// column (250px) and row (532px) layouts moves the whole saved arrangement by the width
// difference, as the corner defaults do, so the wider row neither runs off-screen nor lands on
// the cluster. Returns null when nothing needs to move.
export function shiftEffectListForLayout(
  settings: WidgetSettings,
  nextLayout: WidgetSettings['timedEffects']['listLayout'],
): Record<string, WidgetItemLayout> | null {
  const anchor = settings.general.compactAnchor;
  const listLayout = settings.itemLayouts['timedEffects.list'];
  if (
    settings.general.hudStyle !== 'compact'
    || (anchor !== 'bottomRight' && anchor !== 'topRight')
    || nextLayout === settings.timedEffects.listLayout
    || !listLayout
  ) {
    return null;
  }
  const widthDelta = (COMPACT_EFFECT_ROW_WIDTH - COMPACT_EFFECT_COLUMN_WIDTH) * listLayout.scale;
  const direction = nextLayout === 'horizontal' ? -1 : 1;
  const listViewportWidth = listLayout.viewportWidth ?? 0;
  return Object.fromEntries(
    Object.entries(settings.itemLayouts).map(([itemId, layout]) => {
      // Items saved against another viewport move by the same on-screen distance.
      const ratio = listViewportWidth > 0 && layout.viewportWidth ? layout.viewportWidth / listViewportWidth : 1;
      const x = layout.x + direction * widthDelta * ratio;
      return [itemId, { ...layout, x: Number(Math.max(0, x).toFixed(3)) }];
    }),
  );
}
