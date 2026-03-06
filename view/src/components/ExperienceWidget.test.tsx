// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ExperienceWidget } from './ExperienceWidget';

describe('ExperienceWidget', () => {
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
  });

  it('shows full XP progress in tooltip and level/progress helper text', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ExperienceWidget
          currentXp={123456}
          totalXp={987654}
          level={57}
          visible
          lang="ko"
        />,
      );
    });

    const value = container.querySelector('span');
    expect(value?.textContent).toBe('123,456 / 987,654');
    expect(value?.getAttribute('style')).toContain('max-width: 320px');
    expect(container.textContent).toContain('레벨 57');
    expect(container.textContent).toContain('12%');
    expect(container.firstElementChild?.getAttribute('title')).toContain('경험치 진행도: 123,456 / 987,654 XP');
  });
});
