// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetItemLayout } from '../types/settings';
import { useLayoutHistory } from './useLayoutHistory';

type Layouts = Record<string, WidgetItemLayout>;

function layoutAt(x: number): Layouts {
  return { 'player.gold': { visible: true, x, y: 10, scale: 1, locked: false, zIndex: 1 } };
}

function Harness({ enabled, layouts, onRestore, resetKey }: { enabled: boolean; layouts: Layouts; onRestore: (l: Layouts) => void; resetKey?: string }) {
  useLayoutHistory({ enabled, itemLayouts: layouts, onRestore, resetKey });
  return null;
}

describe('useLayoutHistory', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    vi.useRealTimers();
  });

  function press(key: string, shiftKey = false) {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey }));
    });
  }

  it('undoes and redoes layout edits, merging rapid edits into one step', () => {
    const onRestore = vi.fn();
    const a = layoutAt(0);
    const b = layoutAt(10);
    const c = layoutAt(11);
    const d = layoutAt(50);

    act(() => root!.render(<Harness enabled layouts={a} onRestore={onRestore} />));
    act(() => { vi.advanceTimersByTime(1000); root!.render(<Harness enabled layouts={b} onRestore={onRestore} />); });
    act(() => { vi.advanceTimersByTime(100); root!.render(<Harness enabled layouts={c} onRestore={onRestore} />); });
    act(() => { vi.advanceTimersByTime(1000); root!.render(<Harness enabled layouts={d} onRestore={onRestore} />); });

    press('z');
    expect(onRestore).toHaveBeenLastCalledWith(c);
    act(() => root!.render(<Harness enabled layouts={c} onRestore={onRestore} />));

    press('z');
    expect(onRestore).toHaveBeenLastCalledWith(a);
    act(() => root!.render(<Harness enabled layouts={a} onRestore={onRestore} />));

    press('y');
    expect(onRestore).toHaveBeenLastCalledWith(c);
  });

  it('starts a fresh history when the reset key changes', () => {
    const onRestore = vi.fn();
    act(() => root!.render(<Harness enabled layouts={layoutAt(0)} onRestore={onRestore} resetKey="classic" />));
    act(() => { vi.advanceTimersByTime(1000); root!.render(<Harness enabled layouts={layoutAt(10)} onRestore={onRestore} resetKey="classic" />); });
    act(() => { vi.advanceTimersByTime(1000); root!.render(<Harness enabled layouts={layoutAt(500)} onRestore={onRestore} resetKey="compact" />); });
    press('z');
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does nothing while disabled and ignores text inputs', () => {
    const onRestore = vi.fn();
    act(() => root!.render(<Harness enabled={false} layouts={layoutAt(0)} onRestore={onRestore} />));
    act(() => root!.render(<Harness enabled={false} layouts={layoutAt(5)} onRestore={onRestore} />));
    press('z');
    expect(onRestore).not.toHaveBeenCalled();

    act(() => root!.render(<Harness enabled layouts={layoutAt(5)} onRestore={onRestore} />));
    act(() => { vi.advanceTimersByTime(1000); root!.render(<Harness enabled layouts={layoutAt(9)} onRestore={onRestore} />); });
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); });
    expect(onRestore).not.toHaveBeenCalled();
    input.remove();
  });
});
