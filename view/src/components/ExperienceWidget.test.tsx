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

  it('renders integrated progression details with a stable progressbar hook', async () => {
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

    expect(container.textContent).toContain('57');
    expect(container.textContent).toContain('123,456 / 987,654');
    expect(container.textContent).toContain('12%');
    const iconImage = container.querySelector('img[src*="experience"]');
    expect(iconImage).toBeTruthy();
    expect(iconImage?.getAttribute('width')).toBe('48');
    expect(iconImage?.getAttribute('height')).toBe('48');
    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect((progressbar as HTMLDivElement | null)?.style.width).toBe('68px');
    expect((progressbar as HTMLDivElement | null)?.style.height).toBe('68px');
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('12');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 123,456 / 987,654 XP');
  });

  it('clamps visible progress safely for bad inputs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ExperienceWidget
          currentXp={1300}
          totalXp={1000}
          level={1}
          visible
          lang="ko"
        />,
      );
    });

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('100');
    expect(container.textContent).toContain('1,300 / 1,000');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 1,300 / 1,000 XP');
  });
});
