import { useCallback, useEffect, useRef, useState } from 'react';
import type { UpdateSettingFn, WidgetSize } from '../types/settings';

export type GroupInteractionMode = 'drag' | 'resize';

interface UseGroupEditorParams {
  settingsOpen: boolean;
  groupScales: Record<string, number>;
  updateSetting: UpdateSettingFn;
}

interface GroupInteractionState {
  groupId: string;
  mode: GroupInteractionMode;
}

interface ResizePreviewState {
  groupId: string;
  startClientX: number;
  startScale: number;
  currentScale: number;
}

const PRESET_GROUP_SCALE_MAP: Record<WidgetSize, number> = {
  xsmall: 0.85,
  small: 1.0,
  medium: 1.3,
  large: 1.6,
};

const MIN_GROUP_SCALE = 0.75;
const MAX_GROUP_SCALE = 1.4;

export function getPresetGroupScale(size: WidgetSize): number {
  return PRESET_GROUP_SCALE_MAP[size];
}

function clampGroupScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    return 1;
  }

  return Math.min(MAX_GROUP_SCALE, Math.max(MIN_GROUP_SCALE, Number(scale.toFixed(3))));
}

export function useGroupEditor({
  settingsOpen,
  groupScales,
  updateSetting,
}: UseGroupEditorParams) {
  const [rawSelectedGroupId, setRawSelectedGroupId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<GroupInteractionState | null>(null);
  const [interactionResetToken, setInteractionResetToken] = useState(0);
  const [resizePreview, setResizePreview] = useState<ResizePreviewState | null>(null);
  const resizePreviewRef = useRef<ResizePreviewState | null>(null);

  const syncResizePreview = useCallback(
    (
      nextValue:
        | ResizePreviewState
        | null
        | ((previous: ResizePreviewState | null) => ResizePreviewState | null),
    ) => {
      const next = typeof nextValue === 'function'
        ? nextValue(resizePreviewRef.current)
        : nextValue;
      resizePreviewRef.current = next;
      setResizePreview(next);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    const needsReset = rawSelectedGroupId !== null
      || interaction !== null
      || resizePreviewRef.current !== null;
    setRawSelectedGroupId(null);
    setInteraction(null);
    syncResizePreview(null);
    if (needsReset) {
      setInteractionResetToken(previous => previous + 1);
    }
  }, [interaction, rawSelectedGroupId, syncResizePreview]);

  const selectedGroupId = settingsOpen ? rawSelectedGroupId : null;
  const interactionMode = settingsOpen ? interaction?.mode ?? null : null;

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !selectedGroupId) {
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
  }, [clearSelection, selectedGroupId, settingsOpen]);

  const selectGroup = useCallback((groupId: string) => {
    if (!settingsOpen) {
      return;
    }

    setRawSelectedGroupId(groupId);
    setInteraction(previous => (previous?.groupId === groupId ? previous : null));
    syncResizePreview(previous => (previous?.groupId === groupId ? previous : null));
  }, [settingsOpen, syncResizePreview]);

  const startInteraction = useCallback((groupId: string, mode: GroupInteractionMode) => {
    if (!settingsOpen) {
      return;
    }

    setRawSelectedGroupId(groupId);
    setInteraction({ groupId, mode });
  }, [settingsOpen]);

  const endInteraction = useCallback(() => {
    setInteraction(null);
    syncResizePreview(null);
  }, [syncResizePreview]);

  const resolveGroupScale = useCallback((groupId: string): number => {
    if (resizePreview?.groupId === groupId) {
      return resizePreview.currentScale;
    }

    return groupScales[groupId] ?? 1;
  }, [groupScales, resizePreview]);

  const updateGroupScale = useCallback((groupId: string, scale: number) => {
    const nextScale = clampGroupScale(scale);
    setRawSelectedGroupId(groupId);
    setInteraction({ groupId, mode: 'resize' });
    syncResizePreview(previous => {
      if (previous?.groupId === groupId) {
        return { ...previous, currentScale: nextScale };
      }

      return {
        groupId,
        startClientX: 0,
        startScale: groupScales[groupId] ?? 1,
        currentScale: nextScale,
      };
    });
  }, [groupScales, syncResizePreview]);

  const commitGroupScale = useCallback((groupId: string, scale: number) => {
    const nextScale = clampGroupScale(scale);
    updateSetting(`groupScales.${groupId}`, nextScale);
    setInteraction(previous => (previous?.groupId === groupId ? null : previous));
    syncResizePreview(previous => (previous?.groupId === groupId ? null : previous));
  }, [syncResizePreview, updateSetting]);

  const beginDrag = useCallback((groupId: string) => {
    startInteraction(groupId, 'drag');
  }, [startInteraction]);

  const beginResize = useCallback((groupId: string, startClientX: number) => {
    if (!settingsOpen) {
      return;
    }

    const startScale = groupScales[groupId] ?? 1;
    setRawSelectedGroupId(groupId);
    setInteraction({ groupId, mode: 'resize' });
    syncResizePreview({
      groupId,
      startClientX,
      startScale,
      currentScale: startScale,
    });
  }, [groupScales, settingsOpen, syncResizePreview]);

  const updateResize = useCallback((clientX: number) => {
    syncResizePreview(previous => {
      if (!previous) {
        return previous;
      }

      const nextScale = clampGroupScale(
        previous.startScale * (1 + ((clientX - previous.startClientX) / 200)),
      );
      return {
        ...previous,
        currentScale: nextScale,
      };
    });
  }, [syncResizePreview]);

  const commitResize = useCallback(() => {
    const currentPreview = resizePreviewRef.current;
    if (!currentPreview) {
      return;
    }

    updateSetting(`groupScales.${currentPreview.groupId}`, currentPreview.currentScale);
    setInteraction(previous => (previous?.groupId === currentPreview.groupId ? null : previous));
    syncResizePreview(null);
  }, [syncResizePreview, updateSetting]);

  return {
    selectedGroupId,
    interactionGroupId: interaction?.groupId ?? null,
    interactionMode,
    interactionResetToken,
    selectGroup,
    clearSelection,
    startInteraction,
    endInteraction,
    resolveGroupScale,
    updateGroupScale,
    commitGroupScale,
    beginDrag,
    beginResize,
    updateResize,
    commitResize,
    getScaleMultiplier: resolveGroupScale,
  };
}
