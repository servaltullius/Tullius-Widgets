import {
  bringVisibleItemForward,
  nudgeItemLayout,
  resetItemToDefaultPlacement,
  sendVisibleItemBackward,
} from '../utils/itemLayoutEditing';
import type {
  UpdateSettingFn,
  WidgetItemLayout,
  WidgetSettings,
} from '../types/settings';

export interface SelectedItemLayoutActionsParams {
  selectedItemId: string | null;
  itemLayouts: Record<string, WidgetItemLayout>;
  settings: WidgetSettings;
  viewportWidth: number;
  viewportHeight: number;
  updateSetting: UpdateSettingFn;
}

export interface SelectedItemLayoutActions {
  resetSelectedItemPosition: () => boolean;
  nudgeSelectedItem: (deltaX: number, deltaY: number) => boolean;
  bringSelectedItemForward: () => boolean;
  sendSelectedItemBackward: () => boolean;
}

function commitCanonicalItemLayouts(
  updateSetting: UpdateSettingFn,
  currentLayouts: Record<string, WidgetItemLayout>,
  nextLayouts: Record<string, WidgetItemLayout>,
): boolean {
  if (nextLayouts === currentLayouts) {
    return false;
  }

  updateSetting('itemLayouts', nextLayouts);
  return true;
}

export function createSelectedItemLayoutActions({
  selectedItemId,
  itemLayouts,
  settings,
  viewportWidth,
  viewportHeight,
  updateSetting,
}: SelectedItemLayoutActionsParams): SelectedItemLayoutActions {
  const selectedLayout = selectedItemId ? itemLayouts[selectedItemId] : null;

  return {
    resetSelectedItemPosition(): boolean {
      if (!selectedItemId || !selectedLayout) {
        return false;
      }

      return commitCanonicalItemLayouts(
        updateSetting,
        itemLayouts,
        resetItemToDefaultPlacement({
          itemId: selectedItemId,
          itemLayouts,
          settings,
          viewportWidth,
          viewportHeight,
        }),
      );
    },
    nudgeSelectedItem(deltaX: number, deltaY: number): boolean {
      if (!selectedItemId || !selectedLayout) {
        return false;
      }

      return commitCanonicalItemLayouts(
        updateSetting,
        itemLayouts,
        nudgeItemLayout(itemLayouts, selectedItemId, deltaX, deltaY),
      );
    },
    bringSelectedItemForward(): boolean {
      if (!selectedItemId || !selectedLayout || !selectedLayout.visible || selectedLayout.locked) {
        return false;
      }

      return commitCanonicalItemLayouts(
        updateSetting,
        itemLayouts,
        bringVisibleItemForward(itemLayouts, selectedItemId),
      );
    },
    sendSelectedItemBackward(): boolean {
      if (!selectedItemId || !selectedLayout || !selectedLayout.visible || selectedLayout.locked) {
        return false;
      }

      return commitCanonicalItemLayouts(
        updateSetting,
        itemLayouts,
        sendVisibleItemBackward(itemLayouts, selectedItemId),
      );
    },
  };
}
