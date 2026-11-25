// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetItemLayout } from '../types/settings';
import { getWidgetItemRegistryEntry } from '../data/widgetItemRegistry';
import { useWidgetWheelAdjust } from './useWidgetWheelAdjust';

type Layouts = Record<string, WidgetItemLayout>;

function Harness(props: Parameters<typeof useWidgetWheelAdjust>[0]) {
  useWidgetWheelAdjust(props);
  return null;
}

describe('useWidgetWheelAdjust', () => {
  let container: HTMLDivElement;
  let widget: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    widget = document.createElement('div');
    widget.setAttribute('data-widget-item-id', 'player.gold');
    widget.appendChild(document.createElement('span'));
    document.body.append(container, widget);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    widget.remove();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  function layouts(scale: number, locked = false): Layouts {
    return { 'player.gold': { visible: true, x: 0, y: 0, scale, locked, zIndex: 1 } };
  }

  function render(props: Partial<Parameters<typeof useWidgetWheelAdjust>[0]> & Pick<Parameters<typeof useWidgetWheelAdjust>[0], 'updateSetting' | 'selectItem'>) {
    act(() => root!.render(<Harness enabled itemLayouts={layouts(1)} opacity={70} {...props} />));
  }

  function wheel(target: Element, init: WheelEventInit) {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    act(() => { target.dispatchEvent(event); });
    return event;
  }

  it('grows the widget under the pointer on wheel up and selects it', () => {
    const updateSetting = vi.fn();
    const selectItem = vi.fn();
    render({ updateSetting, selectItem });

    const event = wheel(widget.firstElementChild!, { deltaY: -100 });

    expect(event.defaultPrevented).toBe(true);
    expect(selectItem).toHaveBeenCalledWith('player.gold');
    expect(updateSetting).toHaveBeenCalledWith('itemLayouts.player.gold.scale', 1.05);
  });

  it('stays within the widget size range and leaves a locked widget alone', () => {
    const { minScale, maxScale } = getWidgetItemRegistryEntry('player.gold');
    const updateSetting = vi.fn();
    render({ updateSetting, selectItem: vi.fn(), itemLayouts: layouts(maxScale) });
    wheel(widget, { deltaY: -100 });
    expect(updateSetting).not.toHaveBeenCalled();

    render({ updateSetting, selectItem: vi.fn(), itemLayouts: layouts(minScale + 0.02) });
    wheel(widget, { deltaY: 100 });
    expect(updateSetting).toHaveBeenLastCalledWith('itemLayouts.player.gold.scale', minScale);

    updateSetting.mockClear();
    render({ updateSetting, selectItem: vi.fn(), itemLayouts: layouts(1, true) });
    wheel(widget, { deltaY: -100 });
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('changes the shared background with Shift+wheel, also when the engine reports it sideways', () => {
    const updateSetting = vi.fn();
    render({ updateSetting, selectItem: vi.fn() });

    wheel(widget, { deltaY: -100, shiftKey: true });
    expect(updateSetting).toHaveBeenLastCalledWith('general.opacity', 75);
    // Steps chain even before the new value comes back as props: 75, then one step down.
    wheel(widget, { deltaX: 100, shiftKey: true });
    expect(updateSetting).toHaveBeenLastCalledWith('general.opacity', 70);
  });

  it('ignores the wheel away from widgets and while disabled', () => {
    const updateSetting = vi.fn();
    render({ updateSetting, selectItem: vi.fn() });
    const elsewhere = wheel(container, { deltaY: -100 });
    expect(elsewhere.defaultPrevented).toBe(false);

    render({ updateSetting, selectItem: vi.fn(), enabled: false });
    wheel(widget, { deltaY: -100 });
    expect(updateSetting).not.toHaveBeenCalled();
  });
});
