import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { WidgetSize, WidgetLayout } from '../types/settings';

interface DraggableWidgetGroupProps {
  groupId: string;
  x: number;
  y: number;
  opacity: number;
  size: WidgetSize;
  layout: WidgetLayout;
  accentColor: string;
  transparentBg: boolean;
  draggable: boolean;
  onMove: (groupId: string, x: number, y: number) => void;
  onDragEnd: (groupId: string, x: number, y: number) => void;
  children: ReactNode;
}

const scaleMap: Record<WidgetSize, number> = {
  small: 1.0,
  medium: 1.3,
  large: 1.6,
};

// Snapping is handled by App.tsx (neighbor snap + grid fallback)

// hex → rgba with alpha
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function DraggableWidgetGroup({
  groupId, x, y, opacity, size, layout, accentColor, transparentBg, draggable, onMove, onDragEnd, children,
}: DraggableWidgetGroupProps) {
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef({
    offsetX: 0,
    offsetY: 0,
    currentX: x,
    currentY: y,
  });
  const callbacksRef = useRef({
    groupId,
    onMove,
    onDragEnd,
  });

  useEffect(() => {
    callbacksRef.current = { groupId, onMove, onDragEnd };
  }, [groupId, onMove, onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    dragStateRef.current = {
      offsetX: e.clientX - x,
      offsetY: e.clientY - y,
      currentX: x,
      currentY: y,
    };
    setDragging(true);
  }, [draggable, x, y]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const nextX = e.clientX - dragStateRef.current.offsetX;
      const nextY = e.clientY - dragStateRef.current.offsetY;
      dragStateRef.current.currentX = nextX;
      dragStateRef.current.currentY = nextY;
      callbacksRef.current.onMove(callbacksRef.current.groupId, nextX, nextY);
    };
    const handleUp = () => {
      setDragging(false);
      callbacksRef.current.onDragEnd(
        callbacksRef.current.groupId,
        dragStateRef.current.currentX,
        dragStateRef.current.currentY
      );
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const scale = scaleMap[size];
  const showBg = !transparentBg || draggable;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        opacity: opacity / 100,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        display: 'flex',
        flexDirection: layout === 'horizontal' ? 'row' : 'column',
        gap: layout === 'horizontal' ? '16px' : '0',
        background: showBg
          ? `linear-gradient(135deg, ${hexToRgba(accentColor, 0.12)} 0%, rgba(0,0,0,0.45) 60%)`
          : 'transparent',
        borderRadius: '8px',
        padding: '8px 12px',
        border: draggable
          ? '2px dashed rgba(255, 215, 0, 0.6)'
          : showBg ? `1px solid ${hexToRgba(accentColor, 0.25)}` : 'none',
        boxShadow: showBg
          ? `inset 0 0 20px ${hexToRgba(accentColor, 0.06)}, 0 0 8px ${hexToRgba(accentColor, 0.1)}`
          : 'none',
        userSelect: 'none',
        pointerEvents: draggable ? 'auto' : 'none',
        cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'default',
        zIndex: dragging ? 100 : 1,
      }}
    >
      {children}
    </div>
  );
}
