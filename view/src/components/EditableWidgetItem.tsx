import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WidgetInteractionMode } from '../hooks/useWidgetEditSelection';
import { computeResizeScale } from '../utils/widgetSnap';

interface EditableWidgetItemProps {
  itemId: string;
  x: number;
  y: number;
  scale: number;
  locked: boolean;
  zIndex: number;
  minScale: number;
  maxScale: number;
  opacity: number;
  accentColor: string;
  transparentBg: boolean;
  editable: boolean;
  selected: boolean;
  onSelect: (itemId: string) => void;
  onInteractionStart: (itemId: string, mode: WidgetInteractionMode) => void;
  onInteractionEnd: () => void;
  onMove: (itemId: string, x: number, y: number) => void;
  onDragEnd: (itemId: string, x: number, y: number) => void;
  onResize: (itemId: string, scale: number) => void;
  onResizeEnd: (itemId: string, scale: number) => void;
  onElementRef?: (itemId: string, element: HTMLDivElement | null) => void;
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const EditableWidgetItem = memo(function EditableWidgetItem({
  itemId,
  x,
  y,
  scale,
  locked,
  zIndex,
  minScale,
  maxScale,
  opacity,
  accentColor,
  transparentBg,
  editable,
  selected,
  onSelect,
  onInteractionStart,
  onInteractionEnd,
  onMove,
  onDragEnd,
  onResize,
  onResizeEnd,
  onElementRef,
  children,
}: EditableWidgetItemProps) {
  const [pointerMode, setPointerMode] = useState<WidgetInteractionMode | null>(null);
  const [hovered, setHovered] = useState(false);
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
    originScale: scale,
    currentScale: scale,
  });
  const callbacksRef = useRef({
    itemId,
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
      itemId,
      onSelect,
      onInteractionStart,
      onInteractionEnd,
      onMove,
      onDragEnd,
      onResize,
      onResizeEnd,
    };
  }, [itemId, onSelect, onInteractionStart, onInteractionEnd, onMove, onDragEnd, onResize, onResizeEnd]);

  useEffect(() => {
    onElementRef?.(itemId, containerRef.current);
    return () => onElementRef?.(itemId, null);
  }, [itemId, onElementRef]);

  const activePointerMode = editable && selected ? pointerMode : null;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!editable) {
      return;
    }

    event.preventDefault();
    callbacksRef.current.onSelect(itemId);
    if (locked) {
      return;
    }
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
  }, [editable, itemId, locked, x, y]);

  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    if (!editable || !selected) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    callbacksRef.current.onSelect(itemId);
    if (locked) {
      return;
    }
    callbacksRef.current.onInteractionStart(itemId, 'resize');
    resizeStateRef.current = {
      left: rect.left,
      top: rect.top,
      originDistance: Math.max(1, Math.hypot(event.clientX - rect.left, event.clientY - rect.top)),
      originScale: scale,
      currentScale: scale,
    };
    setPointerMode('resize');
  }, [editable, itemId, locked, scale, selected]);

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
          callbacksRef.current.onInteractionStart(callbacksRef.current.itemId, 'drag');
        }

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          rafId = null;
          callbacksRef.current.onMove(
            callbacksRef.current.itemId,
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
      const nextScale = computeResizeScale({
        originScale: resizeStateRef.current.originScale,
        originDistance: resizeStateRef.current.originDistance,
        nextDistance,
        minScale,
        maxScale,
      });
      resizeStateRef.current.currentScale = nextScale;
      callbacksRef.current.onResize(callbacksRef.current.itemId, nextScale);
    };

    const handleUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (activePointerMode === 'drag') {
        if (dragStateRef.current.started) {
          callbacksRef.current.onDragEnd(
            callbacksRef.current.itemId,
            dragStateRef.current.currentX,
            dragStateRef.current.currentY,
          );
          callbacksRef.current.onInteractionEnd();
        }
      } else {
        callbacksRef.current.onResizeEnd(
          callbacksRef.current.itemId,
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
  }, [activePointerMode, maxScale, minScale]);

  const showBg = !transparentBg || editable;
  const showSelectionFrame = editable && selected;
  const showHoverFrame = editable && hovered && !selected;
  const cursor = activePointerMode === 'drag'
    ? 'grabbing'
    : editable ? (locked ? 'not-allowed' : 'grab') : 'default';

  return (
    <div
      ref={containerRef}
      data-widget-item-id={itemId}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        opacity: opacity / 100,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: showBg
          ? `linear-gradient(135deg, ${hexToRgba(accentColor, 0.12)} 0%, rgba(0,0,0,0.45) 60%)`
          : 'transparent',
        borderRadius: '8px',
        padding: showBg ? '8px 12px' : '0',
        border: showSelectionFrame
          ? `2px solid ${hexToRgba('#ffd700', 0.95)}`
          : showHoverFrame
            ? `1px solid ${hexToRgba('#ffd700', 0.45)}`
            : editable
              ? '1px dashed rgba(255, 215, 0, 0.25)'
              : showBg ? `1px solid ${hexToRgba(accentColor, 0.25)}` : 'none',
        boxShadow: showSelectionFrame
          ? `0 0 0 2px ${hexToRgba('#ffd700', 0.22)}, inset 0 0 20px ${hexToRgba(accentColor, 0.1)}, 0 0 18px ${hexToRgba('#ffd700', 0.2)}`
          : showHoverFrame
            ? `0 0 0 1px ${hexToRgba('#ffd700', 0.14)}, inset 0 0 18px ${hexToRgba(accentColor, 0.08)}`
            : showBg
              ? `inset 0 0 20px ${hexToRgba(accentColor, 0.06)}, 0 0 8px ${hexToRgba(accentColor, 0.1)}`
              : 'none',
        overflow: 'visible',
        userSelect: 'none',
        pointerEvents: editable ? 'auto' : 'none',
        cursor,
        zIndex: activePointerMode
          ? zIndex + 1000
          : showSelectionFrame
            ? zIndex + 500
            : zIndex,
      }}
    >
      {children}
      {showSelectionFrame && (
        <button
          type="button"
          aria-label={`Resize ${itemId}`}
          data-resize-handle={itemId}
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
            cursor: locked ? 'not-allowed' : 'nwse-resize',
            opacity: locked ? 0.55 : 1,
          }}
        />
      )}
    </div>
  );
});
