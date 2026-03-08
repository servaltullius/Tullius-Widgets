// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TimeWidgetList } from './TimeWidgetList';
import { mockStats } from '../data/mockStats';

describe('TimeWidgetList', () => {
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

  it('uses a wider value width for localized time strings', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(mockStats.time.snapshotAtMs);

    await act(async () => {
      root = createRoot(container);
      root.render(
        <TimeWidgetList
          gameTime={mockStats.time}
          showGameDateTime
          showRealDateTime={false}
          lang="ko"
        />,
      );
    });

    const gameDateValue = Array.from(container.querySelectorAll('span')).find(
      element => element.textContent === '4E 201년 8월 21일 14:35',
    );

    expect(gameDateValue).toBeTruthy();
    expect(gameDateValue?.getAttribute('style')).toContain('max-width: 320px');
  });
});
