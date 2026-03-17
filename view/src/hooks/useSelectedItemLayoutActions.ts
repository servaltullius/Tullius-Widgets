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
  setSelectedItemVisible: (nextVisible: boolean) => boolean;
  setSelectedItemScale: (nextScale: number) => boolean;
  setSelectedItemLocked: (nextLocked: boolean) => boolean;
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

  const commitSelectedItemLeaf = (
    leafKey: keyof Pick<WidgetItemLayout, 'visible' | 'scale' | 'locked'>,
    nextValue: boolean | number,
  ): boolean => {
    if (!selectedItemId || !selectedLayout || Object.is(selectedLayout[leafKey], nextValue)) {
      return false;
    }

    updateSetting(`itemLayouts.${selectedItemId}.${leafKey}`, nextValue);
    return true;
  };

  return {
    setSelectedItemVisible(nextVisible: boolean): boolean {
      return commitSelectedItemLeaf('visible', nextVisible);
    },
    setSelectedItemScale(nextScale: number): boolean {
      return commitSelectedItemLeaf('scale', nextScale);
    },
    setSelectedItemLocked(nextLocked: boolean): boolean {
      return commitSelectedItemLeaf('locked', nextLocked);
    },
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
        nudgeItemLayout(itemLayouts, selectedItemId, deltaX, deltaY, viewportWidth, viewportHeight),
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
