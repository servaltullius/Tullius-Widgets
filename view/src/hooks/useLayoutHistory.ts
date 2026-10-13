import { useCallback, useEffect, useRef } from 'react';
import type { WidgetItemLayout } from '../types/settings';
import { isHotkeyCaptureActive } from '../utils/hotkeys';

type ItemLayouts = Record<string, WidgetItemLayout>;

const MAX_HISTORY = 40;
// Edits closer together than this (a drag's x/y writes, held arrow-key nudges) undo as one step.
const COALESCE_MS = 400;

interface UseLayoutHistoryParams {
  enabled: boolean;
  itemLayouts: ItemLayouts;
  onRestore: (itemLayouts: ItemLayouts) => void;
  /** Changing this (e.g. HUD style or cluster corner) starts a fresh history: older layouts
   * belong to a different arrangement and would mix badly with the current one. */
  resetKey?: string;
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

// Undo/redo for widget layout edits while the settings panel is open.
export function useLayoutHistory({ enabled, itemLayouts, onRestore, resetKey = '' }: UseLayoutHistoryParams) {
  const pastRef = useRef<ItemLayouts[]>([]);
  const futureRef = useRef<ItemLayouts[]>([]);
  const currentRef = useRef(itemLayouts);
  const restoringRef = useRef(false);
  const lastRecordedAtRef = useRef(0);
  const resetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (!enabled || resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey;
      pastRef.current = [];
      futureRef.current = [];
      currentRef.current = itemLayouts;
      restoringRef.current = false;
      return;
    }
    if (currentRef.current === itemLayouts) return;

    if (restoringRef.current) {
      restoringRef.current = false;
    } else {
      const now = Date.now();
      if (now - lastRecordedAtRef.current > COALESCE_MS) {
        pastRef.current.push(currentRef.current);
        if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      }
      lastRecordedAtRef.current = now;
      futureRef.current = [];
    }
    currentRef.current = itemLayouts;
  }, [enabled, itemLayouts, resetKey]);

  const undo = useCallback((): boolean => {
    const previous = pastRef.current.pop();
    if (!previous) return false;
    futureRef.current.push(currentRef.current);
    restoringRef.current = true;
    lastRecordedAtRef.current = 0;
    onRestore(previous);
    return true;
  }, [onRestore]);

  const redo = useCallback((): boolean => {
    const next = futureRef.current.pop();
    if (!next) return false;
    pastRef.current.push(currentRef.current);
    restoringRef.current = true;
    lastRecordedAtRef.current = 0;
    onRestore(next);
    return true;
  }, [onRestore]);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isTextEntryTarget(event.target) || isHotkeyCaptureActive()) return;
      const key = event.key.toLowerCase();
      const handled = key === 'z' && !event.shiftKey
        ? undo()
        : (key === 'y' || (key === 'z' && event.shiftKey)) ? redo() : false;
      if (handled) event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, redo, undo]);

  return { undo, redo };
}
