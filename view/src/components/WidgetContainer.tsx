import type { ReactNode } from 'react';
import type { WidgetPosition, WidgetSize } from '../types/settings';

interface WidgetContainerProps {
  children: ReactNode;
  position: WidgetPosition;
  opacity: number;
  size: WidgetSize;
  visible: boolean;
}

const positionStyles: Record<WidgetPosition, React.CSSProperties> = {
  'top-left': { top: '20px', left: '20px' },
  'top-right': { top: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
};

const scaleMap: Record<WidgetSize, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
};

export function WidgetContainer({ children, position, opacity, size, visible }: WidgetContainerProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      ...positionStyles[position],
      opacity: opacity / 100,
      transform: `scale(${scaleMap[size]})`,
      transformOrigin: position.includes('right') ? 'right' : 'left',
      background: 'rgba(0, 0, 0, 0.4)',
      borderRadius: '8px',
      padding: '8px 12px',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      {children}
    </div>
  );
}
