import { useEffect } from 'react';
import type { SelectedItemLayoutActions } from './useSelectedItemLayoutActions';
import { isHotkeyCaptureActive } from '../utils/hotkeys';
import { isSelectMenuOpen } from '../utils/escapeOwners';

interface UseWidgetKeyboardNudgeParams {
  enabled: boolean;
  selectedItemId: string | null;
  selectedItemLayoutActions?: SelectedItemLayoutActions | null;
  onKeyboardNudge?: (deltaX: number, deltaY: number) => void;
}

function isFormControlElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  return element.isContentEditable || tagName === 'input' || tagName === 'select' || tagName === 'textarea'
    // Segmented controls and the category list in the settings window use the arrow keys themselves.
    // A closed select trigger does not: after a pick in the widget's card the arrows still move the
    // widget, and Enter or Space opens the menu.
    || element.closest('[role="radiogroup"], [role="tablist"]') !== null;
}

export function useWidgetKeyboardNudge({
  enabled,
  selectedItemId,
  selectedItemLayoutActions,
  onKeyboardNudge,
}: UseWidgetKeyboardNudgeParams): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedItemId || !selectedItemLayoutActions) {
        return;
      }

      if (isFormControlElement(document.activeElement) || isHotkeyCaptureActive() || isSelectMenuOpen()) {
        return;
      }

      const distance = event.shiftKey ? 10 : 1;
      const deltaByKey: Record<string, [number, number]> = {
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance],
      };
      const delta = deltaByKey[event.key];

      if (!delta) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      selectedItemLayoutActions.nudgeSelectedItem(delta[0], delta[1]);
      onKeyboardNudge?.(delta[0], delta[1]);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, onKeyboardNudge, selectedItemId, selectedItemLayoutActions]);
}
