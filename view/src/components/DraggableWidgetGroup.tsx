import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WidgetLayout } from '../types/settings';
import type { GroupInteractionMode } from '../hooks/useGroupEditor';

interface DraggableWidgetGroupProps {
  groupId: string;
  x: number;
  y: number;
  opacity: number;
  effectiveScale: number;
  groupScale: number;
  layout: WidgetLayout;
  accentColor: string;
  transparentBg: boolean;
  draggable: boolean;
  selected: boolean;
  onSelect: (groupId: string) => void;
  onInteractionStart: (groupId: string, mode: GroupInteractionMode) => void;
  onInteractionEnd: () => void;
  onMove: (groupId: string, x: number, y: number) => void;
  onDragEnd: (groupId: string, x: number, y: number) => void;
  onResize: (groupId: string, scale: number) => void;
  onResizeEnd: (groupId: string, scale: number) => void;
  children: ReactNode;
}

const DRAG_START_DISTANCE = 3;
const RESIZE_HANDLE_SIZE = 16;

interface DragState {
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  started: boolean;
}

interface ResizeState {
  left: number;
  top: number;
  originDistance: number;
  originScale: number;
  currentScale: number;
}

// hex -> rgba with alpha
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const DraggableWidgetGroup = memo(function DraggableWidgetGroup({
  groupId,
  x,
  y,
  opacity,
  effectiveScale,
  groupScale,
  layout,
  accentColor,
  transparentBg,
  draggable,
  selected,
  onSelect,
  onInteractionStart,
  onInteractionEnd,
  onMove,
  onDragEnd,
  onResize,
  onResizeEnd,
  children,
}: DraggableWidgetGroupProps) {
  const [pointerMode, setPointerMode] = useState<GroupInteractionMode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>({
    startClientX: 0,
    startClientY: 0,
    offsetX: 0,
    offsetY: 0,
    currentX: x,
    currentY: y,
    started: false,
  });
  const resizeStateRef = useRef<ResizeState>({
    left: 0,
    top: 0,
    originDistance: 1,
    originScale: groupScale,
    currentScale: groupScale,
  });
  const callbacksRef = useRef({
    groupId,
    onSelect,
    onInteractionStart,
    onInteractionEnd,
    onMove,
    onDragEnd,
    onResize,
    onResizeEnd,
  });

  useEffect(() => {
    callbacksRef.current = {
      groupId,
      onSelect,
      onInteractionStart,
      onInteractionEnd,
      onMove,
      onDragEnd,
      onResize,
      onResizeEnd,
    };
  }, [groupId, onSelect, onInteractionStart, onInteractionEnd, onMove, onDragEnd, onResize, onResizeEnd]);

  const activePointerMode = draggable && selected ? pointerMode : null;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!draggable) {
      return;
    }

    event.preventDefault();
    callbacksRef.current.onSelect(groupId);
    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      offsetX: event.clientX - x,
      offsetY: event.clientY - y,
      currentX: x,
      currentY: y,
      started: false,
    };
    setPointerMode('drag');
  }, [draggable, groupId, x, y]);

  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    if (!draggable || !selected) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    callbacksRef.current.onSelect(groupId);
    callbacksRef.current.onInteractionStart(groupId, 'resize');
    resizeStateRef.current = {
      left: rect.left,
      top: rect.top,
      originDistance: Math.max(1, Math.hypot(event.clientX - rect.left, event.clientY - rect.top)),
      originScale: groupScale,
      currentScale: groupScale,
    };
    setPointerMode('resize');
  }, [draggable, groupId, groupScale, selected]);

  useEffect(() => {
    if (!activePointerMode) {
      return undefined;
    }

    let rafId: number | null = null;

    const handleMove = (event: MouseEvent) => {
      if (activePointerMode === 'drag') {
        dragStateRef.current.currentX = event.clientX - dragStateRef.current.offsetX;
        dragStateRef.current.currentY = event.clientY - dragStateRef.current.offsetY;

        if (!dragStateRef.current.started) {
          const distance = Math.hypot(
            event.clientX - dragStateRef.current.startClientX,
            event.clientY - dragStateRef.current.startClientY,
          );
          if (distance < DRAG_START_DISTANCE) {
            return;
          }

          dragStateRef.current.started = true;
          callbacksRef.current.onInteractionStart(callbacksRef.current.groupId, 'drag');
        }

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          rafId = null;
          callbacksRef.current.onMove(
            callbacksRef.current.groupId,
            dragStateRef.current.currentX,
            dragStateRef.current.currentY,
          );
        });
        return;
      }

      const nextDistance = Math.max(
        1,
        Math.hypot(
          event.clientX - resizeStateRef.current.left,
          event.clientY - resizeStateRef.current.top,
        ),
      );
      const nextScale = resizeStateRef.current.originScale
        * (nextDistance / resizeStateRef.current.originDistance);
      resizeStateRef.current.currentScale = nextScale;
      callbacksRef.current.onResize(callbacksRef.current.groupId, nextScale);
    };

    const handleUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (activePointerMode === 'drag') {
        if (dragStateRef.current.started) {
          callbacksRef.current.onDragEnd(
            callbacksRef.current.groupId,
            dragStateRef.current.currentX,
            dragStateRef.current.currentY,
          );
          callbacksRef.current.onInteractionEnd();
        }
      } else {
        callbacksRef.current.onResizeEnd(
          callbacksRef.current.groupId,
          resizeStateRef.current.currentScale,
        );
        callbacksRef.current.onInteractionEnd();
      }

      setPointerMode(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [activePointerMode]);

  const showBg = !transparentBg || draggable;
  const showSelectionFrame = draggable && selected;
  const cursor = activePointerMode === 'drag'
    ? 'grabbing'
    : draggable ? 'grab' : 'default';

  return (
    <div
      ref={containerRef}
      data-group-id={groupId}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        opacity: opacity / 100,
        transform: `scale(${effectiveScale})`,
        transformOrigin: 'top left',
        display: 'flex',
        flexDirection: layout === 'horizontal' ? 'row' : 'column',
        gap: layout === 'horizontal' ? '16px' : '0',
        background: showBg
          ? `linear-gradient(135deg, ${hexToRgba(accentColor, 0.12)} 0%, rgba(0,0,0,0.45) 60%)`
          : 'transparent',
        borderRadius: '8px',
        padding: '8px 12px',
        border: showSelectionFrame
          ? `2px solid ${hexToRgba('#ffd700', 0.95)}`
          : draggable
            ? '1px dashed rgba(255, 215, 0, 0.35)'
            : showBg ? `1px solid ${hexToRgba(accentColor, 0.25)}` : 'none',
        boxShadow: showSelectionFrame
          ? `0 0 0 2px ${hexToRgba('#ffd700', 0.22)}, inset 0 0 20px ${hexToRgba(accentColor, 0.1)}, 0 0 18px ${hexToRgba('#ffd700', 0.2)}`
          : showBg
            ? `inset 0 0 20px ${hexToRgba(accentColor, 0.06)}, 0 0 8px ${hexToRgba(accentColor, 0.1)}`
            : 'none',
        overflow: 'visible',
        userSelect: 'none',
        pointerEvents: draggable ? 'auto' : 'none',
        cursor,
        zIndex: activePointerMode ? 110 : showSelectionFrame ? 90 : 1,
      }}
    >
      {children}
      {showSelectionFrame && (
        <button
          type="button"
          aria-label={`Resize ${groupId}`}
          data-resize-handle={groupId}
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            right: `${-Math.round(RESIZE_HANDLE_SIZE / 2)}px`,
            bottom: `${-Math.round(RESIZE_HANDLE_SIZE / 2)}px`,
            width: `${RESIZE_HANDLE_SIZE}px`,
            height: `${RESIZE_HANDLE_SIZE}px`,
            borderRadius: '4px',
            border: `1px solid ${hexToRgba('#fff8dc', 0.95)}`,
            background: `linear-gradient(135deg, ${hexToRgba('#ffd700', 0.95)} 0%, ${hexToRgba('#ffb300', 0.9)} 100%)`,
            boxShadow: `0 0 10px ${hexToRgba('#ffd700', 0.35)}`,
            cursor: 'nwse-resize',
          }}
        />
      )}
    </div>
  );
});
