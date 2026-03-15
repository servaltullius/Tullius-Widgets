import type { CSSProperties } from 'react';
import type { Language, WidgetItemLayout } from '../../types/settings';
import { t } from '../../i18n/translations';

interface SelectedWidgetQuickEditCardProps {
  lang: Language;
  title: string;
  layout: WidgetItemLayout;
  minScale: number;
  maxScale: number;
  onToggleVisible?: (nextVisible: boolean) => void;
  onScaleChange?: (nextScale: number) => void;
  onNudgeX?: (deltaX: number) => void;
  onNudgeY?: (deltaY: number) => void;
  onReset?: () => void;
  onToggleLocked?: (nextLocked: boolean) => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
}

export function SelectedWidgetQuickEditCard({
  lang,
  title,
  layout,
  minScale,
  maxScale,
  onToggleVisible = () => {},
  onScaleChange = () => {},
  onNudgeX = () => {},
  onNudgeY = () => {},
  onReset = () => {},
  onToggleLocked = () => {},
  onBringForward = () => {},
  onSendBackward = () => {},
}: SelectedWidgetQuickEditCardProps) {
  const reorderDisabled = layout.locked || !layout.visible;
  const scaleDisabled = layout.locked;

  return (
    <section
      data-selected-widget-quick-edit-card
      style={{
        marginBottom: '16px',
        border: '1px solid rgba(255, 215, 0, 0.24)',
        borderRadius: '12px',
        padding: '14px 16px',
        background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <h3
          data-selected-widget-title
          style={{ margin: 0, color: '#ffe6a8', fontSize: '24px', lineHeight: 1.2 }}
        >
          {title}
        </h3>
        <span style={{ color: '#a8bbd8', fontSize: '14px' }}>
          z {layout.zIndex}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 16px', alignItems: 'center' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ddd', fontSize: '16px' }}>{t(lang, 'showWidgets')}</span>
          <input
            type="checkbox"
            checked={layout.visible}
            data-quick-edit-visibility-toggle="true"
            onChange={event => onToggleVisible(event.target.checked)}
          />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ddd', fontSize: '16px' }}>{t(lang, 'lock')}</span>
          <input
            type="checkbox"
            checked={layout.locked}
            data-quick-edit-lock-toggle="true"
            onChange={event => onToggleLocked(event.target.checked)}
          />
        </label>

        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#ddd', fontSize: '16px', minWidth: '54px' }}>
            {t(lang, 'size')}
          </span>
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={0.05}
            value={layout.scale}
            disabled={scaleDisabled}
            data-quick-edit-size-slider="true"
            onInput={event => onScaleChange(Number((event.target as HTMLInputElement).value))}
            style={{ flex: 1 }}
          />
          <span style={{ color: '#a8bbd8', fontSize: '14px', minWidth: '38px', textAlign: 'right' }}>
            {layout.scale.toFixed(2)}
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ddd', fontSize: '16px', minWidth: '44px' }}>{t(lang, 'positionX')}</span>
          <button type="button" data-quick-edit-nudge-x="-1" onClick={() => onNudgeX(-1)} style={buttonStyle}>-1</button>
          <span style={valueStyle}>{layout.x}</span>
          <button type="button" data-quick-edit-nudge-x="+1" onClick={() => onNudgeX(1)} style={buttonStyle}>+1</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ddd', fontSize: '16px', minWidth: '44px' }}>{t(lang, 'positionY')}</span>
          <button type="button" data-quick-edit-nudge-y="-1" onClick={() => onNudgeY(-1)} style={buttonStyle}>-1</button>
          <span style={valueStyle}>{layout.y}</span>
          <button type="button" data-quick-edit-nudge-y="+1" onClick={() => onNudgeY(1)} style={buttonStyle}>+1</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        <button type="button" data-quick-edit-reset="true" onClick={onReset} style={buttonStyle}>
          {t(lang, 'resetPosition')}
        </button>
        <button
          type="button"
          data-quick-edit-send-backward="true"
          onClick={onSendBackward}
          disabled={reorderDisabled}
          style={buttonStyle}
        >
          {t(lang, 'sendBackward')}
        </button>
        <button
          type="button"
          data-quick-edit-bring-forward="true"
          onClick={onBringForward}
          disabled={reorderDisabled}
          style={buttonStyle}
        >
          {t(lang, 'bringForward')}
        </button>
      </div>
    </section>
  );
}

const buttonStyle: CSSProperties = {
  background: 'var(--tw-color-button-bg)',
  border: '1px solid var(--tw-color-button-border)',
  color: 'var(--tw-color-button-text)',
  borderRadius: 'var(--tw-radius-sm)',
  fontSize: '14px',
  padding: '6px 10px',
  cursor: 'pointer',
};

const valueStyle: CSSProperties = {
  minWidth: '42px',
  textAlign: 'center',
  color: '#a8bbd8',
  fontSize: '14px',
};
