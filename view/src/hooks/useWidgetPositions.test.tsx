// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useCallback, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useWidgetPositions, type UseWidgetPositionsResult } from './useWidgetPositions';
import { useGroupEditor, getPresetGroupScale } from './useGroupEditor';
import { DraggableWidgetGroup } from '../components/DraggableWidgetGroup';
import type { UpdateSettingFn } from '../types/settings';

function Harness({
  onReady,
  updateSetting,
}: {
  onReady: (api: UseWidgetPositionsResult) => void;
  updateSetting: UpdateSettingFn;
}) {
  const api = useWidgetPositions({
    defaults: {
      primary: { x: 0, y: 0 },
      secondary: { x: 100, y: 100 },
    },
    settingsPositions: {},
    updateSetting,
    groupIds: ['primary', 'secondary'],
    snapThreshold: 15,
    grid: 10,
    fallbackPos: { x: 0, y: 0 },
  });

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  return null;
}

function parseScale(transform: string): number {
  const match = /scale\(([^)]+)\)/.exec(transform);
  return match ? Number(match[1]) : 0;
}

function createDomRect({
  left,
  top,
  width,
  height,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
}): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function mockRect(element: Element, rect: { left: number; top: number; width: number; height: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => createDomRect(rect),
  });
}

function dispatchMouse(target: EventTarget, type: string, coords: { clientX: number; clientY: number }) {
  target.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...coords,
  }));
}

function dispatchEscape() {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  }));
}

function InteractionHarness({
  updateSetting,
  settingsOpen = true,
}: {
  updateSetting: UpdateSettingFn;
  settingsOpen?: boolean;
}) {
  const [groupScales, setGroupScales] = useState<Record<string, number>>({});
  const [closeCount, setCloseCount] = useState(0);
  const {
    resolvePosition,
    handleGroupMove,
    handleGroupMoveEnd,
    clearPreviewPositions,
  } = useWidgetPositions({
    defaults: {
      primary: { x: 0, y: 0 },
      secondary: { x: 100, y: 100 },
    },
    settingsPositions: {},
    updateSetting,
    groupIds: ['primary', 'secondary'],
    snapThreshold: 15,
    grid: 10,
    fallbackPos: { x: 0, y: 0 },
  });
  const trackedUpdateSetting = useCallback<UpdateSettingFn>((path, value, options) => {
    updateSetting(path, value, options);
    if (path.startsWith('groupScales.')) {
      const groupId = path.slice('groupScales.'.length);
      setGroupScales(previous => ({ ...previous, [groupId]: Number(value) }));
    }
  }, [updateSetting]);
  const {
    selectedGroupId,
    interactionResetToken,
    selectGroup,
    clearSelection,
    startInteraction,
    endInteraction,
    resolveGroupScale,
    updateGroupScale,
    commitGroupScale,
  } = useGroupEditor({
    settingsOpen,
    groupScales,
    updateSetting: trackedUpdateSetting,
  });

  useEffect(() => {
    if (!settingsOpen) {
      clearSelection();
      clearPreviewPositions();
    }
  }, [clearPreviewPositions, clearSelection, settingsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCloseCount(previous => previous + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderGroup = (groupId: 'primary' | 'secondary') => {
    const groupScale = resolveGroupScale(groupId);
    return (
      <DraggableWidgetGroup
        key={`${groupId}-${interactionResetToken}`}
        groupId={groupId}
        x={resolvePosition(groupId).x}
        y={resolvePosition(groupId).y}
        opacity={100}
        effectiveScale={getPresetGroupScale('medium') * groupScale}
        groupScale={groupScale}
        layout="vertical"
        accentColor="#ffd700"
        transparentBg={false}
        draggable={settingsOpen}
        selected={selectedGroupId === groupId}
        onSelect={selectGroup}
        onInteractionStart={startInteraction}
        onInteractionEnd={endInteraction}
        onMove={handleGroupMove}
        onDragEnd={handleGroupMoveEnd}
        onResize={updateGroupScale}
        onResizeEnd={commitGroupScale}
      >
        <div>{groupId}</div>
      </DraggableWidgetGroup>
    );
  };

  return (
    <>
      {renderGroup('primary')}
      {renderGroup('secondary')}
      <output data-testid="selected-group">{selectedGroupId ?? ''}</output>
      <output data-testid="close-count">{String(closeCount)}</output>
      <output data-testid="primary-position">
        {`${resolvePosition('primary').x},${resolvePosition('primary').y}`}
      </output>
      <output data-testid="primary-group-scale">{String(resolveGroupScale('primary'))}</output>
    </>
  );
}

describe('useWidgetPositions', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latestApi: UseWidgetPositionsResult | null = null;

  beforeEach(() => {
    latestApi = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it('snaps drag position to nearby group and grid', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness updateSetting={updateSetting} onReady={api => { latestApi = api; }} />);
    });

    expect(latestApi).not.toBeNull();

    await act(async () => {
      latestApi?.handleGroupMove('primary', 92, 11);
    });

    expect(latestApi?.resolvePosition('primary')).toEqual({ x: 100, y: 10 });
  });

  it('persists snapped position on drag end', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness updateSetting={updateSetting} onReady={api => { latestApi = api; }} />);
    });

    expect(latestApi).not.toBeNull();

    await act(async () => {
      latestApi?.handleGroupMoveEnd('primary', 92, 11);
    });

    expect(updateSetting).toHaveBeenCalledWith('positions.primary', { x: 100, y: 10 });
  });

  it('changes the selected group when a group is clicked', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<InteractionHarness updateSetting={updateSetting} />);
    });

    const secondary = container.querySelector('[data-group-id="secondary"]');
    const selectedGroup = container.querySelector('[data-testid="selected-group"]');

    expect(secondary).not.toBeNull();
    expect(selectedGroup?.textContent).toBe('');

    await act(async () => {
      dispatchMouse(secondary!, 'mousedown', { clientX: 140, clientY: 140 });
      dispatchMouse(window, 'mouseup', { clientX: 140, clientY: 140 });
    });

    expect(selectedGroup?.textContent).toBe('secondary');
  });

  it('uses the resize handle to update scale without moving the group position', async () => {
    const updateSetting = vi.fn<UpdateSettingFn>();

    await act(async () => {
      root = createRoot(container);
      root.render(<InteractionHarness updateSetting={updateSetting} />);
    });

    const primary = container.querySelector('[data-group-id="primary"]') as HTMLDivElement | null;
    expect(primary).not.toBeNull();

    await act(async () => {
      dispatchMouse(primary!, 'mousedown', { clientX: 20, clientY: 20 });
      dispatchMouse(window, 'mouseup', { clientX: 20, clientY: 20 });
    });

    const selectedPrimary = container.querySelector('[data-group-id="primary"]') as HTMLDivElement | null;
    expect(selectedPrimary).not.toBeNull();
    mockRect(selectedPrimary!, { left: 10, top: 20, width: 90, height: 30 });

    const resizeHandle = container.querySelector('[data-resize-handle="primary"]');
    const primaryPosition = container.querySelector('[data-testid="primary-position"]');
    const primaryScale = container.querySelector('[data-testid="primary-group-scale"]');

    expect(resizeHandle).not.toBeNull();
    expect(parseScale(selectedPrimary!.style.transform)).toBeCloseTo(1.3, 5);

    await act(async () => {
      dispatchMouse(resizeHandle!, 'mousedown', { clientX: 100, clientY: 50 });
    });

    await act(async () => {
      dispatchMouse(window, 'mousemove', { clientX: 127, clientY: 59 });
      dispatchMouse(window, 'mouseup', { clientX: 127, clientY: 59 });
    });

    expect(primaryPosition?.textContent).toBe('0,0');
    expect(primaryScale?.textContent).not.toBe('1');
    expect(parseScale(selectedPrimary!.style.transform)).toBeCloseTo(1.69, 5);
    expect(updateSetting.mock.calls.some(([path]) => path === 'groupScales.primary')).toBe(true);
    expect(updateSetting.mock.calls.some(([path]) => path === 'positions.primary')).toBe(false);
  });

  it('clears the selection on first escape before allowing settings close behavior', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<InteractionHarness updateSetting={updateSetting} />);
    });

    const primary = container.querySelector('[data-group-id="primary"]');
    const selectedGroup = container.querySelector('[data-testid="selected-group"]');
    const closeCount = container.querySelector('[data-testid="close-count"]');

    expect(primary).not.toBeNull();

    await act(async () => {
      dispatchMouse(primary!, 'mousedown', { clientX: 20, clientY: 20 });
      dispatchMouse(window, 'mouseup', { clientX: 20, clientY: 20 });
    });

    expect(selectedGroup?.textContent).toBe('primary');
    expect(closeCount?.textContent).toBe('0');

    await act(async () => {
      dispatchEscape();
    });

    expect(selectedGroup?.textContent).toBe('');
    expect(closeCount?.textContent).toBe('0');

    await act(async () => {
      dispatchEscape();
    });

    expect(closeCount?.textContent).toBe('1');
  });

  it('cancels drag preview and persistence when edit mode closes mid-drag', async () => {
    const updateSetting = vi.fn<UpdateSettingFn>();

    await act(async () => {
      root = createRoot(container);
      root.render(<InteractionHarness updateSetting={updateSetting} settingsOpen />);
    });

    const primary = container.querySelector('[data-group-id="primary"]');
    const primaryPosition = container.querySelector('[data-testid="primary-position"]');

    expect(primary).not.toBeNull();
    expect(primaryPosition?.textContent).toBe('0,0');

    await act(async () => {
      dispatchMouse(primary!, 'mousedown', { clientX: 20, clientY: 20 });
    });

    await act(async () => {
      dispatchMouse(window, 'mousemove', { clientX: 63, clientY: 67 });
    });

    expect(primaryPosition?.textContent).not.toBe('0,0');

    await act(async () => {
      root?.render(<InteractionHarness updateSetting={updateSetting} settingsOpen={false} />);
    });

    expect(primaryPosition?.textContent).toBe('0,0');

    await act(async () => {
      dispatchMouse(window, 'mouseup', { clientX: 63, clientY: 67 });
    });

    expect(updateSetting.mock.calls.some(([path]) => path === 'positions.primary')).toBe(false);
    expect(primaryPosition?.textContent).toBe('0,0');
  });

  it('cancels resize persistence when edit mode closes mid-resize', async () => {
    const updateSetting = vi.fn<UpdateSettingFn>();

    await act(async () => {
      root = createRoot(container);
      root.render(<InteractionHarness updateSetting={updateSetting} settingsOpen />);
    });

    const primary = container.querySelector('[data-group-id="primary"]') as HTMLDivElement | null;
    expect(primary).not.toBeNull();

    await act(async () => {
      dispatchMouse(primary!, 'mousedown', { clientX: 20, clientY: 20 });
      dispatchMouse(window, 'mouseup', { clientX: 20, clientY: 20 });
    });

    const selectedPrimary = container.querySelector('[data-group-id="primary"]') as HTMLDivElement | null;
    expect(selectedPrimary).not.toBeNull();
    mockRect(selectedPrimary!, { left: 10, top: 20, width: 90, height: 30 });

    const resizeHandle = container.querySelector('[data-resize-handle="primary"]');
    const primaryScale = container.querySelector('[data-testid="primary-group-scale"]');

    expect(resizeHandle).not.toBeNull();
    expect(primaryScale?.textContent).toBe('1');

    await act(async () => {
      dispatchMouse(resizeHandle!, 'mousedown', { clientX: 100, clientY: 50 });
    });

    await act(async () => {
      dispatchMouse(window, 'mousemove', { clientX: 127, clientY: 59 });
    });

    expect(primaryScale?.textContent).not.toBe('1');

    await act(async () => {
      root?.render(<InteractionHarness updateSetting={updateSetting} settingsOpen={false} />);
    });

    expect(primaryScale?.textContent).toBe('1');

    await act(async () => {
      dispatchMouse(window, 'mouseup', { clientX: 127, clientY: 59 });
    });

    expect(updateSetting.mock.calls.some(([path]) => path === 'groupScales.primary')).toBe(false);
    expect(primaryScale?.textContent).toBe('1');
  });
});
