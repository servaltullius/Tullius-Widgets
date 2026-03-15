import { useMemo } from 'react';
import { resolveWidgetItemLayouts } from '../data/widgetItemRegistry';
import type { WidgetItemLayout, WidgetSettings } from '../types/settings';

export interface UseWidgetItemLayoutsParams {
  settings: WidgetSettings;
  viewportWidth: number;
  viewportHeight: number;
}

export { resolveWidgetItemLayouts } from '../data/widgetItemRegistry';

export function useWidgetItemLayouts({
  settings,
  viewportWidth,
  viewportHeight,
}: UseWidgetItemLayoutsParams): Record<string, WidgetItemLayout> {
  return useMemo(() => {
    return resolveWidgetItemLayouts({
      settings,
      viewportWidth,
      viewportHeight,
    });
  }, [settings, viewportHeight, viewportWidth]);
}
