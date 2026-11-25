import { useEffect, useRef } from 'react';
import type { UpdateSettingFn, WidgetItemLayout } from '../types/settings';
import { getWidgetItemRegistryEntry } from '../data/widgetItemRegistry';
import { releaseKeyboardFocus } from '../utils/keyboardFocus';

export const WHEEL_SCALE_STEP = 0.05;
export const WHEEL_OPACITY_STEP = 5;
const MIN_OPACITY = 10;
const MAX_OPACITY = 100;

interface UseWidgetWheelAdjustParams {
  enabled: boolean;
  itemLayouts: Record<string, WidgetItemLayout>;
  opacity: number;
  updateSetting: UpdateSettingFn;
  selectItem: (itemId: string) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// While the settings are open and no widget is being dragged or resized, the wheel over a HUD
// widget resizes it (within its own size range,
// not when locked) and selects it so the quick-edit card shows the new size. Shift+wheel changes
// the shared slot opacity instead; there is no per-widget opacity. Wheel input elsewhere, such as
// over the settings window, is left alone.
// (A wheel step during a drag would select the widget under the pointer and drop the drag.)
export function useWidgetWheelAdjust({ enabled, itemLayouts, opacity, updateSetting, selectItem }: UseWidgetWheelAdjustParams): void {
  const latestRef = useRef({ itemLayouts, opacity, updateSetting, selectItem });
  useEffect(() => {
    latestRef.current = { itemLayouts, opacity, updateSetting, selectItem };
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const handleWheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const widget = target?.closest('[data-widget-item-id]');
      const itemId = widget?.getAttribute('data-widget-item-id');
      if (!itemId) return;
      // Some engines turn Shift+wheel into a sideways scroll, so with Shift read whichever axis
      // moved; a plain sideways scroll does not resize.
      const delta = event.shiftKey && event.deltaY === 0 ? event.deltaX : event.deltaY;
      event.preventDefault();
      if (delta === 0) return;
      const direction = delta < 0 ? 1 : -1;
      const latest = latestRef.current;

      // Wheel steps can arrive faster than the page re-renders, so each step also moves the values
      // the next one starts from instead of waiting for the new props.
      if (event.shiftKey) {
        const nextOpacity = clamp(latest.opacity + direction * WHEEL_OPACITY_STEP, MIN_OPACITY, MAX_OPACITY);
        if (nextOpacity === latest.opacity) return;
        latest.opacity = nextOpacity;
        latest.updateSetting('general.opacity', nextOpacity);
        return;
      }

      const layout = latest.itemLayouts[itemId];
      if (!layout) return;
      releaseKeyboardFocus();
      latest.selectItem(itemId);
      if (layout.locked) return;
      const entry = getWidgetItemRegistryEntry(itemId);
      // Three decimals, the precision the resolution conversion keeps, so a step up and a step down
      // return to the same size.
      const nextScale = Math.round(clamp(layout.scale + direction * WHEEL_SCALE_STEP, entry.minScale, entry.maxScale) * 1000) / 1000;
      if (nextScale === layout.scale) return;
      latest.itemLayouts = { ...latest.itemLayouts, [itemId]: { ...layout, scale: nextScale } };
      latest.updateSetting(`itemLayouts.${itemId}.scale`, nextScale);
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [enabled]);
}
