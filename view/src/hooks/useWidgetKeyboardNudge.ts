import { useEffect } from 'react';
import type { SelectedItemLayoutActions } from './useSelectedItemLayoutActions';

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
  return element.isContentEditable || tagName === 'input' || tagName === 'select' || tagName === 'textarea';
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

      if (isFormControlElement(document.activeElement)) {
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
