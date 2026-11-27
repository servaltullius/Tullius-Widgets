import type { CSSProperties } from 'react';
import type { ItemShowWhen, Language, WidgetItemLayout } from '../../types/settings';
import { CustomSelect } from './SettingsControls';
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
  showWhen?: ItemShowWhen;
  showWhenOptions?: readonly ItemShowWhen[];
  onShowWhenChange?: (next: ItemShowWhen) => void;
  /** Opens the settings category that holds this widget; the button is hidden without it. */
  onShowRelatedSettings?: () => void;
  /** Deselects the widget; the close button is hidden without it. */
  onClose?: () => void;
  /** The widget's y is its bottom edge (the effect list growing up), so the label says so. */
  anchorBottom?: boolean;
  panelScale?: number;
}

const SHOW_WHEN_LABEL_KEYS = {
  always: 'showWhenAlways',
  combat: 'showWhenCombat',
  change: 'showWhenChange',
  combatOrChange: 'showWhenCombatOrChange',
} as const;

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
  showWhen,
  showWhenOptions = ['always', 'combat', 'change', 'combatOrChange'],
  onShowWhenChange,
  onShowRelatedSettings,
  onClose,
  anchorBottom = false,
  panelScale = 1,
}: SelectedWidgetQuickEditCardProps) {
  const positionYLabel = t(lang, anchorBottom ? 'positionYBottom' : 'positionY');
  const reorderDisabled = layout.locked || !layout.visible;
  const scaleDisabled = layout.locked;
  const span = maxScale - minScale;
  const fill = span > 0 ? Math.min(100, Math.max(0, ((layout.scale - minScale) / span) * 100)) : 0;

  return (
    <section className="tw-p-card" data-selected-widget-quick-edit-card>
      <div className="tw-p-card-head">
        <h3 className="tw-p-card-title" data-selected-widget-title style={{ margin: 0 }}>{title}</h3>
        <span className="tw-p-card-head-side">
          <span className="tw-p-help" style={{ margin: 0 }}>z {layout.zIndex}</span>
          {onClose && (
            <button type="button" className="tw-p-btn is-small is-icon" data-quick-edit-close="true" aria-label={t(lang, 'close')} title={t(lang, 'close')} onClick={onClose}>
              ×
            </button>
          )}
        </span>
      </div>

      <label className="tw-p-row tw-p-toggle-row" style={{ borderTop: 0 }}>
        <span className="tw-p-label">{t(lang, 'showWidgets')}</span>
        <span className="tw-p-switch">
          <input
            type="checkbox"
            role="switch"
            checked={layout.visible}
            data-quick-edit-visibility-toggle="true"
            onChange={event => onToggleVisible(event.target.checked)}
          />
          <span className="tw-p-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="tw-p-row tw-p-toggle-row">
        <span className="tw-p-label">{t(lang, 'lock')}</span>
        <span className="tw-p-switch">
          <input
            type="checkbox"
            role="switch"
            checked={layout.locked}
            data-quick-edit-lock-toggle="true"
            onChange={event => onToggleLocked(event.target.checked)}
          />
          <span className="tw-p-switch-track" aria-hidden="true" />
        </span>
      </label>
      <div className="tw-p-row">
        <span className="tw-p-label">{t(lang, 'size')}</span>
        <span className="tw-p-slider">
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={0.05}
            value={layout.scale}
            disabled={scaleDisabled}
            aria-label={t(lang, 'size')}
            data-quick-edit-size-slider="true"
            style={{ '--fill': `${fill}%` } as CSSProperties}
            onInput={event => onScaleChange(Number((event.target as HTMLInputElement).value))}
          />
          <span className="tw-p-slider-value">{layout.scale.toFixed(2)}</span>
        </span>
      </div>
      <div className="tw-p-row">
        <span className="tw-p-label">{t(lang, 'positionX')}</span>
        <span className="tw-p-button-row">
          <button type="button" className="tw-p-btn is-small" data-quick-edit-nudge-x="-1" aria-label={`${t(lang, 'positionX')} -1`} onClick={() => onNudgeX(-1)}>−1</button>
          <span className="tw-p-nudge-value">{Math.round(layout.x)}</span>
          <button type="button" className="tw-p-btn is-small" data-quick-edit-nudge-x="+1" aria-label={`${t(lang, 'positionX')} +1`} onClick={() => onNudgeX(1)}>+1</button>
        </span>
      </div>
      <div className="tw-p-row">
        <span className="tw-p-label">{positionYLabel}</span>
        <span className="tw-p-button-row">
          <button type="button" className="tw-p-btn is-small" data-quick-edit-nudge-y="-1" aria-label={`${positionYLabel} -1`} onClick={() => onNudgeY(-1)}>−1</button>
          <span className="tw-p-nudge-value">{Math.round(layout.y)}</span>
          <button type="button" className="tw-p-btn is-small" data-quick-edit-nudge-y="+1" aria-label={`${positionYLabel} +1`} onClick={() => onNudgeY(1)}>+1</button>
        </span>
      </div>
      {showWhen && onShowWhenChange && (
        <div className="tw-p-row">
          <span className="tw-p-label">{t(lang, 'showWhenLabel')}</span>
          <CustomSelect
            value={showWhen}
            options={showWhenOptions.map(value => ({ value, label: t(lang, SHOW_WHEN_LABEL_KEYS[value]) }))}
            onChange={next => onShowWhenChange(next as ItemShowWhen)}
            panelScale={panelScale}
            testId="selected-widget-show-when"
          />
        </div>
      )}
      <div className="tw-p-button-row" style={{ marginTop: 'calc(8px * var(--ps))' }}>
        <button type="button" className="tw-p-btn is-small" data-quick-edit-reset="true" onClick={onReset}>
          {t(lang, 'resetPosition')}
        </button>
        <button type="button" className="tw-p-btn is-small" data-quick-edit-send-backward="true" onClick={onSendBackward} disabled={reorderDisabled}>
          {t(lang, 'sendBackward')}
        </button>
        <button type="button" className="tw-p-btn is-small" data-quick-edit-bring-forward="true" onClick={onBringForward} disabled={reorderDisabled}>
          {t(lang, 'bringForward')}
        </button>
      </div>
      {onShowRelatedSettings && (
        <button type="button" className="tw-p-btn is-small tw-p-card-link" data-quick-edit-related-settings="true" onClick={onShowRelatedSettings}>
          {t(lang, 'quickEditRelatedSettings')}
        </button>
      )}
    </section>
  );
}
