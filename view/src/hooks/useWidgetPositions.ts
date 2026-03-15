import { useCallback, useState } from 'react';
import type { GroupPosition, UpdateSettingFn } from '../types/settings';

interface UseWidgetPositionsParams {
  defaults: Record<string, GroupPosition>;
  settingsPositions: Record<string, GroupPosition>;
  updateSetting: UpdateSettingFn;
  groupIds: readonly string[];
  snapThreshold: number;
  grid: number;
  fallbackPos: GroupPosition;
}

interface ComputeSnappedPositionParams {
  positions: Record<string, GroupPosition>;
  settingsPositions: Record<string, GroupPosition>;
  defaults: Record<string, GroupPosition>;
  fallbackPos: GroupPosition;
  groupIds: readonly string[];
  snapThreshold: number;
  grid: number;
  groupId: string;
  rawX: number;
  rawY: number;
}

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
}

interface SnapResult {
  position: GroupPosition;
  guides: AlignmentGuide[];
}

export interface UseWidgetPositionsResult {
  resolvePosition: (groupId: string) => GroupPosition;
  handleGroupMove: (groupId: string, rawX: number, rawY: number) => void;
  handleGroupMoveEnd: (groupId: string, rawX: number, rawY: number) => void;
  clearPreviewPositions: () => void;
  activeGuides: AlignmentGuide[];
}

interface DragPreviewState {
  positions: Record<string, GroupPosition>;
  activeGuides: AlignmentGuide[];
}

function resolvePositionById(
  positions: Record<string, GroupPosition>,
  settingsPositions: Record<string, GroupPosition>,
  defaults: Record<string, GroupPosition>,
  fallbackPos: GroupPosition,
  id: string,
): GroupPosition {
  return positions[id] ?? settingsPositions[id] ?? defaults[id] ?? fallbackPos;
}

function snapPosition(
  groupIds: readonly string[],
  snapThreshold: number,
  grid: number,
  groupId: string,
  rawX: number,
  rawY: number,
  getPositionById: (id: string) => GroupPosition,
): SnapResult {
  let x = rawX;
  let y = rawY;
  let snappedX = false;
  let snappedY = false;
  let guideX: number | null = null;
  let guideY: number | null = null;

  for (const otherId of groupIds) {
    if (otherId === groupId) continue;
    const otherPos = getPositionById(otherId);
    if (!snappedX && Math.abs(x - otherPos.x) < snapThreshold) {
      x = otherPos.x;
      snappedX = true;
      guideX = otherPos.x;
    }
    if (!snappedY && Math.abs(y - otherPos.y) < snapThreshold) {
      y = otherPos.y;
      snappedY = true;
      guideY = otherPos.y;
    }
  }

  if (!snappedX) {
    x = Math.round(x / grid) * grid;
    guideX = x;
  }
  if (!snappedY) {
    y = Math.round(y / grid) * grid;
    guideY = y;
  }

  const guides: AlignmentGuide[] = [];
  if (guideX !== null) {
    guides.push({ orientation: 'vertical', position: guideX });
  }
  if (guideY !== null) {
    guides.push({ orientation: 'horizontal', position: guideY });
  }

  return {
    position: { x, y },
    guides,
  };
}

function computeSnapResult({
  positions,
  settingsPositions,
  defaults,
  fallbackPos,
  groupIds,
  snapThreshold,
  grid,
  groupId,
  rawX,
  rawY,
}: ComputeSnappedPositionParams): SnapResult {
  const getPositionById = (id: string): GroupPosition =>
    resolvePositionById(positions, settingsPositions, defaults, fallbackPos, id);

  return snapPosition(groupIds, snapThreshold, grid, groupId, rawX, rawY, getPositionById);
}

export function useWidgetPositions({
  defaults,
  settingsPositions,
  updateSetting,
  groupIds,
  snapThreshold,
  grid,
  fallbackPos,
}: UseWidgetPositionsParams): UseWidgetPositionsResult {
  const [previewState, setPreviewState] = useState<DragPreviewState>({
    positions: {},
    activeGuides: [],
  });

  const resolvePosition = useCallback((groupId: string): GroupPosition => {
    return resolvePositionById(previewState.positions, settingsPositions, defaults, fallbackPos, groupId);
  }, [defaults, fallbackPos, previewState.positions, settingsPositions]);

  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    setPreviewState(previous => {
      const snapped = computeSnapResult({
        positions: previous.positions,
        settingsPositions,
        defaults,
        fallbackPos,
        groupIds,
        snapThreshold,
        grid,
        groupId,
        rawX,
        rawY,
      });
      return {
        positions: { ...previous.positions, [groupId]: snapped.position },
        activeGuides: snapped.guides,
      };
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    setPreviewState(previous => {
      const snapped = computeSnapResult({
        positions: previous.positions,
        settingsPositions,
        defaults,
        fallbackPos,
        groupIds,
        snapThreshold,
        grid,
        groupId,
        rawX,
        rawY,
      });
      updateSetting(`positions.${groupId}`, snapped.position);
      const next = { ...previous.positions };
      delete next[groupId];
      return {
        positions: next,
        activeGuides: [],
      };
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold, updateSetting]);

  const clearPreviewPositions = useCallback(() => {
    setPreviewState(previous => {
      if (
        Object.keys(previous.positions).length === 0
        && previous.activeGuides.length === 0
      ) {
        return previous;
      }

      return {
        positions: {},
        activeGuides: [],
      };
    });
  }, []);

  return {
    resolvePosition,
    handleGroupMove,
    handleGroupMoveEnd,
    clearPreviewPositions,
    activeGuides: previewState.activeGuides,
  };
}
