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
): GroupPosition {
  let x = rawX;
  let y = rawY;
  let snappedX = false;
  let snappedY = false;

  for (const otherId of groupIds) {
    if (otherId === groupId) continue;
    const otherPos = getPositionById(otherId);
    if (!snappedX && Math.abs(x - otherPos.x) < snapThreshold) {
      x = otherPos.x;
      snappedX = true;
    }
    if (!snappedY && Math.abs(y - otherPos.y) < snapThreshold) {
      y = otherPos.y;
      snappedY = true;
    }
  }

  if (!snappedX) x = Math.round(x / grid) * grid;
  if (!snappedY) y = Math.round(y / grid) * grid;

  return { x, y };
}

function computeSnappedPosition({
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
}: ComputeSnappedPositionParams): GroupPosition {
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
}: UseWidgetPositionsParams) {
  const [dragPositions, setDragPositions] = useState<Record<string, GroupPosition>>({});

  const resolvePosition = useCallback((groupId: string): GroupPosition => {
    return resolvePositionById(dragPositions, settingsPositions, defaults, fallbackPos, groupId);
  }, [defaults, dragPositions, fallbackPos, settingsPositions]);

  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    setDragPositions(previous => {
      const snapped = computeSnappedPosition({
        positions: previous,
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
      return { ...previous, [groupId]: snapped };
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    setDragPositions(previous => {
      const snapped = computeSnappedPosition({
        positions: previous,
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
      updateSetting(`positions.${groupId}`, snapped);
      const next = { ...previous };
      delete next[groupId];
      return next;
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold, updateSetting]);

  return {
    resolvePosition,
    handleGroupMove,
    handleGroupMoveEnd,
  };
}
