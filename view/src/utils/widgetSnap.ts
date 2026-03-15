import type { WidgetBounds } from './widgetBounds';

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start?: number;
  end?: number;
}

interface SnapAxisCandidate {
  snappedPosition: number;
  guidePosition: number;
  distance: number;
  start: number;
  end: number;
}

interface SnapAxisResult {
  position: number;
  guide: AlignmentGuide;
}

interface SnapWidgetMoveParams {
  activeId: string;
  rawX: number;
  rawY: number;
  boundsById: Record<string, WidgetBounds>;
  snapThreshold: number;
  grid: number;
}

function clampScale(scale: number, minScale: number, maxScale: number): number {
  if (!Number.isFinite(scale)) {
    return minScale;
  }

  return Number(Math.min(maxScale, Math.max(minScale, scale)).toFixed(3));
}

function createMovedBounds(activeBounds: WidgetBounds, x: number, y: number): WidgetBounds {
  return {
    left: x,
    top: y,
    width: activeBounds.width,
    height: activeBounds.height,
    right: x + activeBounds.width,
    bottom: y + activeBounds.height,
    centerX: x + (activeBounds.width / 2),
    centerY: y + (activeBounds.height / 2),
  };
}

function resolveGridGuide(
  orientation: AlignmentGuide['orientation'],
  snappedPosition: number,
  primaryStart: number,
  primaryEnd: number,
): SnapAxisResult {
  return {
    position: snappedPosition,
    guide: {
      orientation,
      position: snappedPosition,
      start: primaryStart,
      end: primaryEnd,
    },
  };
}

function pickBestCandidate(candidates: SnapAxisCandidate[], threshold: number): SnapAxisCandidate | null {
  let best: SnapAxisCandidate | null = null;

  for (const candidate of candidates) {
    if (candidate.distance > threshold) {
      continue;
    }

    if (!best || candidate.distance < best.distance) {
      best = candidate;
    }
  }

  return best;
}

function resolveXAxisSnap(
  rawX: number,
  rawY: number,
  activeBounds: WidgetBounds,
  otherBounds: WidgetBounds[],
  snapThreshold: number,
  grid: number,
): SnapAxisResult {
  const candidates: SnapAxisCandidate[] = [];

  for (const other of otherBounds) {
    const targetXs = [other.left, other.right];
    for (const target of targetXs) {
      candidates.push({
        snappedPosition: target,
        guidePosition: target,
        distance: Math.abs(rawX - target),
        start: Math.min(rawY, other.top),
        end: Math.max(rawY + activeBounds.height, other.bottom),
      });
      candidates.push({
        snappedPosition: target - activeBounds.width,
        guidePosition: target,
        distance: Math.abs((rawX + activeBounds.width) - target),
        start: Math.min(rawY, other.top),
        end: Math.max(rawY + activeBounds.height, other.bottom),
      });
    }

    candidates.push({
      snappedPosition: other.centerX - (activeBounds.width / 2),
      guidePosition: other.centerX,
      distance: Math.abs((rawX + (activeBounds.width / 2)) - other.centerX),
      start: Math.min(rawY, other.top),
      end: Math.max(rawY + activeBounds.height, other.bottom),
    });
  }

  const bestCandidate = pickBestCandidate(candidates, snapThreshold);
  if (bestCandidate) {
    return {
      position: bestCandidate.snappedPosition,
      guide: {
        orientation: 'vertical',
        position: bestCandidate.guidePosition,
        start: bestCandidate.start,
        end: bestCandidate.end,
      },
    };
  }

  const snappedPosition = Math.round(rawX / grid) * grid;
  return resolveGridGuide('vertical', snappedPosition, rawY, rawY + activeBounds.height);
}

function resolveYAxisSnap(
  rawX: number,
  rawY: number,
  activeBounds: WidgetBounds,
  otherBounds: WidgetBounds[],
  snapThreshold: number,
  grid: number,
): SnapAxisResult {
  const candidates: SnapAxisCandidate[] = [];

  for (const other of otherBounds) {
    const targetYs = [other.top, other.bottom];
    for (const target of targetYs) {
      candidates.push({
        snappedPosition: target,
        guidePosition: target,
        distance: Math.abs(rawY - target),
        start: Math.min(rawX, other.left),
        end: Math.max(rawX + activeBounds.width, other.right),
      });
      candidates.push({
        snappedPosition: target - activeBounds.height,
        guidePosition: target,
        distance: Math.abs((rawY + activeBounds.height) - target),
        start: Math.min(rawX, other.left),
        end: Math.max(rawX + activeBounds.width, other.right),
      });
    }

    candidates.push({
      snappedPosition: other.centerY - (activeBounds.height / 2),
      guidePosition: other.centerY,
      distance: Math.abs((rawY + (activeBounds.height / 2)) - other.centerY),
      start: Math.min(rawX, other.left),
      end: Math.max(rawX + activeBounds.width, other.right),
    });
  }

  const bestCandidate = pickBestCandidate(candidates, snapThreshold);
  if (bestCandidate) {
    return {
      position: bestCandidate.snappedPosition,
      guide: {
        orientation: 'horizontal',
        position: bestCandidate.guidePosition,
        start: bestCandidate.start,
        end: bestCandidate.end,
      },
    };
  }

  const snappedPosition = Math.round(rawY / grid) * grid;
  return resolveGridGuide('horizontal', snappedPosition, rawX, rawX + activeBounds.width);
}

export function computeResizeScale(params: {
  originScale: number;
  originDistance: number;
  nextDistance: number;
  minScale: number;
  maxScale: number;
}): number {
  const {
    originScale,
    originDistance,
    nextDistance,
    minScale,
    maxScale,
  } = params;
  const safeOriginDistance = Math.max(1, originDistance);
  const safeNextDistance = Math.max(1, nextDistance);
  return clampScale(originScale * (safeNextDistance / safeOriginDistance), minScale, maxScale);
}

export function snapWidgetMove({
  activeId,
  rawX,
  rawY,
  boundsById,
  snapThreshold,
  grid,
}: SnapWidgetMoveParams): { position: { x: number; y: number }; guides: AlignmentGuide[] } {
  const activeBounds = boundsById[activeId];
  if (!activeBounds) {
    return {
      position: {
        x: Math.round(rawX / grid) * grid,
        y: Math.round(rawY / grid) * grid,
      },
      guides: [],
    };
  }

  const otherBounds = Object.entries(boundsById)
    .filter(([itemId]) => itemId !== activeId)
    .map(([, bounds]) => bounds);

  const xSnap = resolveXAxisSnap(rawX, rawY, activeBounds, otherBounds, snapThreshold, grid);
  const movedBounds = createMovedBounds(activeBounds, xSnap.position, rawY);
  const ySnap = resolveYAxisSnap(xSnap.position, rawY, movedBounds, otherBounds, snapThreshold, grid);

  return {
    position: { x: xSnap.position, y: ySnap.position },
    guides: [xSnap.guide, ySnap.guide],
  };
}
