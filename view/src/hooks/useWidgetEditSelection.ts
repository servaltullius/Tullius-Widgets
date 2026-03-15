import { useCallback, useEffect, useState } from 'react';

export type WidgetInteractionMode = 'drag' | 'resize';

export interface UseWidgetEditSelectionResult {
  selectedItemId: string | null;
  interactionItemId: string | null;
  interactionMode: WidgetInteractionMode | null;
  interactionResetToken: number;
  selectItem: (itemId: string) => void;
  clearSelection: () => void;
  startInteraction: (itemId: string, mode: WidgetInteractionMode) => void;
  endInteraction: () => void;
}

export function useWidgetEditSelection({
  settingsOpen,
}: {
  settingsOpen: boolean;
}): UseWidgetEditSelectionResult {
  const [rawSelectedItemId, setRawSelectedItemId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<{ itemId: string; mode: WidgetInteractionMode } | null>(null);
  const [interactionResetToken, setInteractionResetToken] = useState(0);

  const clearSelection = useCallback(() => {
    const hadSelection = rawSelectedItemId !== null || interaction !== null;
    setRawSelectedItemId(null);
    setInteraction(null);
    if (hadSelection) {
      setInteractionResetToken(previous => previous + 1);
    }
  }, [interaction, rawSelectedItemId]);

  const selectedItemId = settingsOpen ? rawSelectedItemId : null;

  useEffect(() => {
    if (!settingsOpen) {
      queueMicrotask(() => {
        clearSelection();
      });
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !rawSelectedItemId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      clearSelection();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [clearSelection, rawSelectedItemId, settingsOpen]);

  const selectItem = useCallback((itemId: string) => {
    if (!settingsOpen) {
      return;
    }

    setRawSelectedItemId(itemId);
    setInteraction(previous => (previous?.itemId === itemId ? previous : null));
  }, [settingsOpen]);

  const startInteraction = useCallback((itemId: string, mode: WidgetInteractionMode) => {
    if (!settingsOpen) {
      return;
    }

    setRawSelectedItemId(itemId);
    setInteraction({ itemId, mode });
  }, [settingsOpen]);

  const endInteraction = useCallback(() => {
    setInteraction(null);
  }, []);

  return {
    selectedItemId,
    interactionItemId: interaction?.itemId ?? null,
    interactionMode: settingsOpen ? interaction?.mode ?? null : null,
    interactionResetToken,
    selectItem,
    clearSelection,
    startInteraction,
    endInteraction,
  };
}
