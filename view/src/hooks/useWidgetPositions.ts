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
    return dragPositions[groupId] ?? settingsPositions[groupId] ?? defaults[groupId] ?? fallbackPos;
  }, [defaults, dragPositions, fallbackPos, settingsPositions]);

  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settingsPositions[id] ?? defaults[id] ?? fallbackPos;
    const snapped = snapPosition(groupIds, snapThreshold, grid, groupId, rawX, rawY, getPositionById);
    setDragPositions(previous => ({ ...previous, [groupId]: snapped }));
  }, [defaults, dragPositions, fallbackPos, grid, groupIds, settingsPositions, snapThreshold]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settingsPositions[id] ?? defaults[id] ?? fallbackPos;
    const snapped = snapPosition(groupIds, snapThreshold, grid, groupId, rawX, rawY, getPositionById);

    setDragPositions(previous => {
      const next = { ...previous };
      delete next[groupId];
      return next;
    });
    updateSetting(`positions.${groupId}`, snapped);
  }, [defaults, dragPositions, fallbackPos, grid, groupIds, settingsPositions, snapThreshold, updateSetting]);

  return {
    resolvePosition,
    handleGroupMove,
    handleGroupMoveEnd,
  };
}
