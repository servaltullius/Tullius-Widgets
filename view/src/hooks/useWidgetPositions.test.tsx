// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { useWidgetPositions } from './useWidgetPositions';
import type { GroupPosition, UpdateSettingFn } from '../types/settings';

interface HookApi {
  resolvePosition: (groupId: string) => GroupPosition;
  handleGroupMove: (groupId: string, rawX: number, rawY: number) => void;
  handleGroupMoveEnd: (groupId: string, rawX: number, rawY: number) => void;
}

function Harness({
  onReady,
  updateSetting,
}: {
  onReady: (api: HookApi) => void;
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

describe('useWidgetPositions', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latestApi: HookApi | null = null;

  beforeEach(() => {
    latestApi = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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
});
