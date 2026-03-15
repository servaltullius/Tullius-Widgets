// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useWidgetEditSelection, type UseWidgetEditSelectionResult } from './useWidgetEditSelection';

function dispatchEscape() {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  }));
}

function Harness({
  settingsOpen = true,
  onReady,
}: {
  settingsOpen?: boolean;
  onReady: (api: UseWidgetEditSelectionResult) => void;
}) {
  const [closeCount, setCloseCount] = useState(0);
  const api = useWidgetEditSelection({ settingsOpen });

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCloseCount(previous => previous + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <output data-testid="selected-item">{api.selectedItemId ?? ''}</output>
      <output data-testid="close-count">{String(closeCount)}</output>
    </>
  );
}

describe('useWidgetEditSelection', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latestApi: UseWidgetEditSelectionResult | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    latestApi = null;
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
  });

  it('clears selected items on first escape before allowing outer close behavior', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onReady={api => { latestApi = api; }} />);
    });

    const selectedItem = container.querySelector('[data-testid="selected-item"]');
    const closeCount = container.querySelector('[data-testid="close-count"]');

    await act(async () => {
      latestApi?.selectItem('player.level');
    });

    expect(selectedItem?.textContent).toBe('player.level');
    expect(closeCount?.textContent).toBe('0');

    await act(async () => {
      dispatchEscape();
    });

    expect(selectedItem?.textContent).toBe('');
    expect(closeCount?.textContent).toBe('0');

    await act(async () => {
      dispatchEscape();
    });

    expect(closeCount?.textContent).toBe('1');
  });

  it('clears selection when edit mode closes', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness settingsOpen onReady={api => { latestApi = api; }} />);
    });

    const selectedItem = container.querySelector('[data-testid="selected-item"]');

    await act(async () => {
      latestApi?.selectItem('time.game');
    });

    expect(selectedItem?.textContent).toBe('time.game');

    await act(async () => {
      root?.render(<Harness settingsOpen={false} onReady={api => { latestApi = api; }} />);
    });

    expect(selectedItem?.textContent).toBe('');
  });
});
