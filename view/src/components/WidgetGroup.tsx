import type { ReactNode } from 'react';

interface WidgetGroupProps {
  children: ReactNode;
}

export function WidgetGroup({ children }: WidgetGroupProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: '4px',
      marginBottom: '4px',
    }}>
      {children}
    </div>
  );
}
