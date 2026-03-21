// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SelectedItemLayoutActions } from './useSelectedItemLayoutActions';
import { useWidgetKeyboardNudge } from './useWidgetKeyboardNudge';

function dispatchArrowKey(key: string, options: { shiftKey?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: options.shiftKey ?? false,
  }));
}

function Harness({
  enabled = true,
  selectedItemId = 'player.level',
  actions,
  onKeyboardNudge,
}: {
  enabled?: boolean;
  selectedItemId?: string | null;
  actions: SelectedItemLayoutActions;
  onKeyboardNudge?: (deltaX: number, deltaY: number) => void;
}) {
  useWidgetKeyboardNudge({
    enabled,
    selectedItemId,
    selectedItemLayoutActions: actions,
    onKeyboardNudge,
  });

  useEffect(() => {}, []);
  return null;
}

describe('useWidgetKeyboardNudge', () => {
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
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('nudges the selected widget by 1px with arrow keys', async () => {
    const actions: SelectedItemLayoutActions = {
      setSelectedItemVisible: vi.fn(() => false),
      setSelectedItemScale: vi.fn(() => false),
      setSelectedItemLocked: vi.fn(() => false),
      resetSelectedItemPosition: vi.fn(() => false),
      nudgeSelectedItem: vi.fn(() => true),
      bringSelectedItemForward: vi.fn(() => false),
      sendSelectedItemBackward: vi.fn(() => false),
    };
    const onKeyboardNudge = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness actions={actions} onKeyboardNudge={onKeyboardNudge} />);
    });

    await act(async () => {
      dispatchArrowKey('ArrowRight');
    });

    expect(actions.nudgeSelectedItem).toHaveBeenCalledWith(1, 0);
    expect(onKeyboardNudge).toHaveBeenCalledWith(1, 0);
  });

  it('nudges by 10px when shift is held', async () => {
    const actions: SelectedItemLayoutActions = {
      setSelectedItemVisible: vi.fn(() => false),
      setSelectedItemScale: vi.fn(() => false),
      setSelectedItemLocked: vi.fn(() => false),
      resetSelectedItemPosition: vi.fn(() => false),
      nudgeSelectedItem: vi.fn(() => true),
      bringSelectedItemForward: vi.fn(() => false),
      sendSelectedItemBackward: vi.fn(() => false),
    };
    const onKeyboardNudge = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness actions={actions} onKeyboardNudge={onKeyboardNudge} />);
    });

    await act(async () => {
      dispatchArrowKey('ArrowDown', { shiftKey: true });
    });

    expect(actions.nudgeSelectedItem).toHaveBeenCalledWith(0, 10);
    expect(onKeyboardNudge).toHaveBeenCalledWith(0, 10);
  });

  it('does nothing when no widget is selected', async () => {
    const actions: SelectedItemLayoutActions = {
      setSelectedItemVisible: vi.fn(() => false),
      setSelectedItemScale: vi.fn(() => false),
      setSelectedItemLocked: vi.fn(() => false),
      resetSelectedItemPosition: vi.fn(() => false),
      nudgeSelectedItem: vi.fn(() => true),
      bringSelectedItemForward: vi.fn(() => false),
      sendSelectedItemBackward: vi.fn(() => false),
    };

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness actions={actions} selectedItemId={null} />);
    });

    await act(async () => {
      dispatchArrowKey('ArrowLeft');
    });

    expect(actions.nudgeSelectedItem).not.toHaveBeenCalled();
  });

  it('ignores arrow keys while a form control has focus', async () => {
    const actions: SelectedItemLayoutActions = {
      setSelectedItemVisible: vi.fn(() => false),
      setSelectedItemScale: vi.fn(() => false),
      setSelectedItemLocked: vi.fn(() => false),
      resetSelectedItemPosition: vi.fn(() => false),
      nudgeSelectedItem: vi.fn(() => true),
      bringSelectedItemForward: vi.fn(() => false),
      sendSelectedItemBackward: vi.fn(() => false),
    };
    const onKeyboardNudge = vi.fn();

    const input = document.createElement('input');
    document.body.appendChild(input);

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness actions={actions} onKeyboardNudge={onKeyboardNudge} />);
    });

    input.focus();
    await act(async () => {
      dispatchArrowKey('ArrowUp');
    });

    expect(actions.nudgeSelectedItem).not.toHaveBeenCalled();
    expect(onKeyboardNudge).not.toHaveBeenCalled();
  });
});
