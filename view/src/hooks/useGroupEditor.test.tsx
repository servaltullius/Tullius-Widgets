// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useGroupEditor } from './useGroupEditor';
import type { UpdateSettingFn } from '../types/settings';

interface HookApi {
  selectedGroupId: string | null;
  interactionMode: 'drag' | 'resize' | null;
  selectGroup: (groupId: string) => void;
  beginDrag: (groupId: string) => void;
  beginResize: (groupId: string, startClientX: number) => void;
  updateResize: (clientX: number) => void;
  commitResize: () => void;
  getScaleMultiplier: (groupId: string) => number;
}

function Harness({
  onReady,
  updateSetting,
}: {
  onReady: (api: HookApi) => void;
  updateSetting: UpdateSettingFn;
}) {
  const api = useGroupEditor({
    settingsOpen: true,
    groupScales: {},
    updateSetting,
  });

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  return null;
}

describe('useGroupEditor', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latestApi: HookApi | null = null;

  beforeEach(() => {
    latestApi = null;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it('selects a group and clears selection on escape before closing settings', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness updateSetting={updateSetting} onReady={api => { latestApi = api; }} />);
    });

    expect(latestApi).not.toBeNull();

    await act(async () => {
      latestApi?.selectGroup('playerInfo');
    });

    expect(latestApi?.selectedGroupId).toBe('playerInfo');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(latestApi?.selectedGroupId).toBeNull();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('tracks drag and resize modes separately', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness updateSetting={updateSetting} onReady={api => { latestApi = api; }} />);
    });

    expect(latestApi).not.toBeNull();

    await act(async () => {
      latestApi?.beginDrag('playerInfo');
    });

    expect(latestApi?.selectedGroupId).toBe('playerInfo');
    expect(latestApi?.interactionMode).toBe('drag');

    await act(async () => {
      latestApi?.beginResize('playerInfo', 100);
      latestApi?.updateResize(140);
    });

    expect(latestApi?.interactionMode).toBe('resize');
    expect(latestApi?.getScaleMultiplier('playerInfo')).toBeCloseTo(1.2);
  });

  it('persists resized scale instead of position updates', async () => {
    const updateSetting: UpdateSettingFn = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness updateSetting={updateSetting} onReady={api => { latestApi = api; }} />);
    });

    expect(latestApi).not.toBeNull();

    await act(async () => {
      latestApi?.beginResize('playerInfo', 100);
      latestApi?.updateResize(160);
      latestApi?.commitResize();
    });

    expect(updateSetting).toHaveBeenCalledWith('groupScales.playerInfo', 1.3);
  });
});
