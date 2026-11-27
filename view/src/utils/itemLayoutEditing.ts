import {
  COMPACT_EFFECT_COLUMN_WIDTH,
  COMPACT_EFFECT_ROW_WIDTH,
  WIDGET_ITEM_IDS,
  resolveWidgetItemLayouts,
  getWidgetItemDefaultZIndex,
} from '../data/widgetItemRegistry';
import type { HudStyle, LayoutSlot, WidgetItemLayout, WidgetSettings } from '../types/settings';
import type { WidgetBounds } from './widgetBounds';

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
    size: settings.general.size,
    effectsGrowDirection: settings.timedEffects.growDirection,
    itemLayouts: Object.fromEntries(
      Object.entries(resolved).map(([itemId, layout]) => [
        itemId,
        { ...layout, viewportWidth: baseline.width, viewportHeight: baseline.height },
      ]),
    ),
  };
}

/**
 * The effect list's y after switching which way it grows, so it stays where it is on screen:
 * growing up its y is the bottom edge, growing down the top edge. `bounds` is the list as drawn
 * now, in the same screen pixels the current viewport's layouts use.
 */
export function effectListYForGrowDirection(
  next: WidgetSettings['timedEffects']['growDirection'],
  bounds: Pick<WidgetBounds, 'top' | 'bottom'>,
): number {
  return Number((next === 'up' ? bounds.bottom : bounds.top).toFixed(3));
}

// Height of an effect list showing only its empty line, before scaling: the best guess for a list
// that is switched off and so cannot be measured.
const EMPTY_EFFECT_LIST_HEIGHT = { compact: 15, classic: 34 } as const;

/**
 * Where the effect list would be on screen, for when it is switched off and cannot be measured:
 * its saved spot with the height of its empty line, so changing its direction then still keeps
 * the empty list in place once it is shown again.
 */
export function estimateEffectListBounds(
  settings: WidgetSettings,
  viewport: { width: number; height: number },
): Pick<WidgetBounds, 'top' | 'bottom'> | null {
  const layout = resolveWidgetItemLayouts({ settings, viewportWidth: viewport.width, viewportHeight: viewport.height })['timedEffects.list'];
  if (!layout) return null;
  const height = EMPTY_EFFECT_LIST_HEIGHT[settings.general.hudStyle] * layout.scale;
  return settings.timedEffects.growDirection === 'up'
    ? { top: layout.y - height, bottom: layout.y }
    : { top: layout.y, bottom: layout.y + height };
}

/**
 * The item layouts to save as the effect list changes direction. Widgets not yet saved are
 * written down where they are now: the default arrangement depends on the direction (a right-hand
 * compact corner moves the cluster by the grow-up list's column), so leaving them to the defaults
 * would move them when only the list's growth should change. The list itself gets `listY`, the
 * edge it grows from next, when it could be measured or estimated.
 */
export function pinItemLayoutsForGrowSwitch(
  settings: WidgetSettings,
  viewport: { width: number; height: number },
  listY: number | null,
): Record<string, WidgetItemLayout> {
  const resolved = resolveWidgetItemLayouts({ settings, viewportWidth: viewport.width, viewportHeight: viewport.height });
  const pinned: Record<string, WidgetItemLayout> = { ...settings.itemLayouts };
  for (const [itemId, layout] of Object.entries(resolved)) {
    if (!pinned[itemId]) pinned[itemId] = stampLayoutViewport(layout, viewport.width, viewport.height);
  }
  const list = resolved['timedEffects.list'];
  if (list && listY !== null) {
    pinned['timedEffects.list'] = { ...stampLayoutViewport(list, viewport.width, viewport.height), y: listY };
  }
  return pinned;
}

// In a right-hand compact corner the effect list hugs the right edge; switching between the
// column (250px) and row (532px) layouts moves the cluster by the width difference, as the
// corner defaults do, so the wider row neither runs off-screen nor lands on the cluster. Only
// items still inside the default cluster move; widgets dragged elsewhere stay put. Returns
// null when nothing needs to move.
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

  // The default cluster's box (both list layouts) in screen fractions, with a little slack.
  const baseline = { width: 1920, height: 1080 };
  const boxes = (['vertical', 'horizontal'] as const).map(layout => {
    const defaults = resolveWidgetItemLayouts({
      settings: { ...settings, timedEffects: { ...settings.timedEffects, listLayout: layout }, positions: {}, layouts: {}, groupScales: {}, itemLayouts: {} },
      viewportWidth: baseline.width,
      viewportHeight: baseline.height,
    });
    const items = Object.values(defaults);
    return {
      minX: Math.min(...items.map(item => item.x)) / baseline.width,
      minY: Math.min(...items.map(item => item.y)) / baseline.height,
      maxY: Math.max(...items.map(item => item.y)) / baseline.height,
    };
  });
  const slack = 0.03;
  const minX = Math.min(...boxes.map(box => box.minX)) - slack;
  const minY = Math.min(...boxes.map(box => box.minY)) - slack;
  const maxY = Math.max(...boxes.map(box => box.maxY)) + slack;

  const listWidth = listLayout.viewportWidth ?? baseline.width;
  const listHeight = listLayout.viewportHeight ?? baseline.height;
  const widthDelta = (COMPACT_EFFECT_ROW_WIDTH - COMPACT_EFFECT_COLUMN_WIDTH) * listLayout.scale;
  const direction = nextLayout === 'horizontal' ? -1 : 1;
  return Object.fromEntries(
    Object.entries(settings.itemLayouts).map(([itemId, layout]) => {
      const width = layout.viewportWidth ?? baseline.width;
      const height = layout.viewportHeight ?? baseline.height;
      const inCluster = layout.x / width >= minX && layout.y / height >= minY && layout.y / height <= maxY;
      if (!inCluster) return [itemId, layout];
      // Same on-screen distance for items saved against another viewport (resolve-time scale).
      const scale = Math.min(width / listWidth, height / listHeight);
      return [itemId, { ...layout, x: Number((layout.x + direction * widthDelta * scale).toFixed(3)) }];
    }),
  );
}
