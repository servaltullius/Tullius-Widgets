import type { CSSProperties } from 'react';
import type { Language, WidgetItemLayout } from '../../types/settings';
import { t } from '../../i18n/translations';
import { scalePanelPixels } from './panelScale';

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
  panelScale?: number;
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
  panelScale = 1,
}: SelectedWidgetQuickEditCardProps) {
  const reorderDisabled = layout.locked || !layout.visible;
  const scaleDisabled = layout.locked;
  const buttonStyle = createButtonStyle(panelScale);
  const valueStyle = createValueStyle(panelScale);

  return (
    <section
      data-selected-widget-quick-edit-card
      style={{
        marginBottom: scalePanelPixels(16, panelScale),
        border: '1px solid rgba(255, 215, 0, 0.24)',
        borderRadius: scalePanelPixels(12, panelScale),
        padding: `${scalePanelPixels(14, panelScale)} ${scalePanelPixels(16, panelScale)}`,
        background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: scalePanelPixels(12, panelScale), marginBottom: scalePanelPixels(12, panelScale) }}>
        <h3
          data-selected-widget-title
          style={{ margin: 0, color: '#ffe6a8', fontSize: scalePanelPixels(24, panelScale), lineHeight: 1.2 }}
        >
          {title}
        </h3>
        <span style={{ color: '#a8bbd8', fontSize: scalePanelPixels(14, panelScale) }}>
          z {layout.zIndex}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: `${scalePanelPixels(10, panelScale)} ${scalePanelPixels(16, panelScale)}`, alignItems: 'center' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: scalePanelPixels(8, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(16, panelScale) }}>{t(lang, 'showWidgets')}</span>
          <input
            type="checkbox"
            checked={layout.visible}
            data-quick-edit-visibility-toggle="true"
            onChange={event => onToggleVisible(event.target.checked)}
          />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: scalePanelPixels(8, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(16, panelScale) }}>{t(lang, 'lock')}</span>
          <input
            type="checkbox"
            checked={layout.locked}
            data-quick-edit-lock-toggle="true"
            onChange={event => onToggleLocked(event.target.checked)}
          />
        </label>

        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: scalePanelPixels(12, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(16, panelScale), minWidth: scalePanelPixels(54, panelScale) }}>
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
          <span style={{ color: '#a8bbd8', fontSize: scalePanelPixels(14, panelScale), minWidth: scalePanelPixels(38, panelScale), textAlign: 'right' }}>
            {layout.scale.toFixed(2)}
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: scalePanelPixels(8, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(16, panelScale), minWidth: scalePanelPixels(44, panelScale) }}>{t(lang, 'positionX')}</span>
          <button type="button" data-quick-edit-nudge-x="-1" onClick={() => onNudgeX(-1)} style={buttonStyle}>-1</button>
          <span style={valueStyle}>{layout.x}</span>
          <button type="button" data-quick-edit-nudge-x="+1" onClick={() => onNudgeX(1)} style={buttonStyle}>+1</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: scalePanelPixels(8, panelScale) }}>
          <span style={{ color: '#ddd', fontSize: scalePanelPixels(16, panelScale), minWidth: scalePanelPixels(44, panelScale) }}>{t(lang, 'positionY')}</span>
          <button type="button" data-quick-edit-nudge-y="-1" onClick={() => onNudgeY(-1)} style={buttonStyle}>-1</button>
          <span style={valueStyle}>{layout.y}</span>
          <button type="button" data-quick-edit-nudge-y="+1" onClick={() => onNudgeY(1)} style={buttonStyle}>+1</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: scalePanelPixels(8, panelScale), marginTop: scalePanelPixels(12, panelScale) }}>
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

function createButtonStyle(panelScale: number): CSSProperties {
  return {
    background: 'var(--tw-color-button-bg)',
    border: '1px solid var(--tw-color-button-border)',
    color: 'var(--tw-color-button-text)',
    borderRadius: 'var(--tw-radius-sm)',
    fontSize: scalePanelPixels(14, panelScale),
    padding: `${scalePanelPixels(6, panelScale)} ${scalePanelPixels(10, panelScale)}`,
    cursor: 'pointer',
  };
}

function createValueStyle(panelScale: number): CSSProperties {
  return {
    minWidth: scalePanelPixels(42, panelScale),
    textAlign: 'center',
    color: '#a8bbd8',
    fontSize: scalePanelPixels(14, panelScale),
  };
}
