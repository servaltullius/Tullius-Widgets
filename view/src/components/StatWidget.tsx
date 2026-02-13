interface StatWidgetProps {
  icon: string;
  value: number;
  unit?: string;
  visible: boolean;
  cap?: number;
}

export function StatWidget({ icon, value, unit = '', visible, cap }: StatWidgetProps) {
  if (!visible) return null;

  const isAtCap = cap !== undefined && value >= cap;
  const isNegative = value < 0;

  const valueColor = isAtCap ? '#ffd700' : isNegative ? '#ff4444' : '#ffffff';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '2px 0',
    }}>
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
      <span style={{
        color: valueColor,
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        minWidth: '40px',
        textAlign: 'right',
      }}>
        {Math.round(value)}{unit}
      </span>
    </div>
  );
}
