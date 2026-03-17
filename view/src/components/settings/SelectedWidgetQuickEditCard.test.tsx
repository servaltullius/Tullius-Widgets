// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SelectedWidgetQuickEditCard } from './SelectedWidgetQuickEditCard';

describe('SelectedWidgetQuickEditCard', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });

  it('renders a compact selected-widget shell and emits quick-edit callbacks', async () => {
    const onToggleVisible = vi.fn();
    const onScaleChange = vi.fn();
    const onNudgeX = vi.fn();
    const onNudgeY = vi.fn();
    const onReset = vi.fn();
    const onToggleLocked = vi.fn();
    const onBringForward = vi.fn();
    const onSendBackward = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SelectedWidgetQuickEditCard
          lang="ko"
          title="레벨"
          layout={{
            visible: true,
            x: 120,
            y: 240,
            scale: 1.25,
            locked: false,
            zIndex: 3,
          }}
          minScale={0.7}
          maxScale={2.4}
          onToggleVisible={onToggleVisible}
          onScaleChange={onScaleChange}
          onNudgeX={onNudgeX}
          onNudgeY={onNudgeY}
          onReset={onReset}
          onToggleLocked={onToggleLocked}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
        />,
      );
    });

    expect(container.querySelector('[data-selected-widget-quick-edit-card]')).toBeTruthy();
    expect(container.textContent).toContain('레벨');
    expect(container.textContent).toContain('크기');

    const visibilityToggle = container.querySelector('input[type="checkbox"][data-quick-edit-visibility-toggle="true"]') as HTMLInputElement | null;
    const sizeSlider = container.querySelector('input[type="range"][data-quick-edit-size-slider="true"]') as HTMLInputElement | null;
    const xPositive = container.querySelector('button[data-quick-edit-nudge-x="+1"]') as HTMLButtonElement | null;
    const yNegative = container.querySelector('button[data-quick-edit-nudge-y="-1"]') as HTMLButtonElement | null;
    const resetButton = container.querySelector('button[data-quick-edit-reset="true"]') as HTMLButtonElement | null;
    const lockToggle = container.querySelector('input[type="checkbox"][data-quick-edit-lock-toggle="true"]') as HTMLInputElement | null;
    const bringForwardButton = container.querySelector('button[data-quick-edit-bring-forward="true"]') as HTMLButtonElement | null;
    const sendBackwardButton = container.querySelector('button[data-quick-edit-send-backward="true"]') as HTMLButtonElement | null;

    expect(visibilityToggle?.style.width).toBe('18px');
    expect(visibilityToggle?.style.height).toBe('18px');
    expect(visibilityToggle?.style.appearance).toBe('none');
    expect(lockToggle?.style.width).toBe('18px');
    expect(lockToggle?.style.height).toBe('18px');
    expect(lockToggle?.style.appearance).toBe('none');

    await act(async () => {
      visibilityToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      sizeSlider!.value = '1.55';
      sizeSlider?.dispatchEvent(new Event('input', { bubbles: true }));
      xPositive?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      yNegative?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      lockToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      bringForwardButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      sendBackwardButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleVisible).toHaveBeenCalledWith(false);
    expect(onScaleChange).toHaveBeenCalledWith(1.55);
    expect(onNudgeX).toHaveBeenCalledWith(1);
    expect(onNudgeY).toHaveBeenCalledWith(-1);
    expect(onReset).toHaveBeenCalled();
    expect(onToggleLocked).toHaveBeenCalledWith(true);
    expect(onBringForward).toHaveBeenCalled();
    expect(onSendBackward).toHaveBeenCalled();
  });
});
