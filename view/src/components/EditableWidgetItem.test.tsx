// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EditableWidgetItem } from './EditableWidgetItem';

describe('EditableWidgetItem', () => {
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

  it('keeps locked widgets selectable while blocking drag and resize', async () => {
    const onSelect = vi.fn();
    const onInteractionStart = vi.fn();
    const onInteractionEnd = vi.fn();
    const onMove = vi.fn();
    const onDragEnd = vi.fn();
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <EditableWidgetItem
          itemId="player.level"
          x={100}
          y={120}
          scale={1}
          minScale={0.7}
          maxScale={2.4}
          opacity={100}
          accentColor="#4fd1c5"
          transparentBg={false}
          editable
          selected
          locked
          zIndex={4}
          onSelect={onSelect}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          onMove={onMove}
          onDragEnd={onDragEnd}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        >
          <div>locked widget</div>
        </EditableWidgetItem>,
      );
    });

    const widget = container.querySelector('[data-widget-item-id="player.level"]') as HTMLDivElement | null;
    const resizeHandle = container.querySelector('[data-resize-handle="player.level"]') as HTMLButtonElement | null;
    expect(widget).not.toBeNull();
    expect(resizeHandle).not.toBeNull();
    expect(widget?.style.border).toContain('2px solid');
    expect(widget?.style.zIndex).toBe('4');

    await act(async () => {
      widget?.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 120,
        clientY: 140,
      }));
      window.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 180,
        clientY: 200,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: 180,
        clientY: 200,
      }));
    });

    await act(async () => {
      resizeHandle?.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 180,
        clientY: 200,
      }));
      window.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 220,
        clientY: 240,
      }));
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: 220,
        clientY: 240,
      }));
    });

    expect(onSelect).toHaveBeenCalledWith('player.level');
    expect(onInteractionStart).not.toHaveBeenCalled();
    expect(onInteractionEnd).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
    expect(onResizeEnd).not.toHaveBeenCalled();
  });
});
