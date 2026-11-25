import { useCallback, useEffect, useRef, useState } from 'react';
import { claimEscape } from '../utils/escapeOwners';

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

  // A selected widget answers Esc (deselect), so the plugin must not close the panel on that key.
  const clearSelectionRef = useRef(clearSelection);
  useEffect(() => {
    clearSelectionRef.current = clearSelection;
  }, [clearSelection]);
  useEffect(() => (selectedItemId ? claimEscape('selection', () => clearSelectionRef.current()) : undefined), [selectedItemId]);

  useEffect(() => {
    if (settingsOpen) return;
    queueMicrotask(() => {
      clearSelection();
    });
  }, [clearSelection, settingsOpen]);

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
