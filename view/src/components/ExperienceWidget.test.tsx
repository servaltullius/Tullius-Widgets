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

  it('renders a level mark and thin horizontal progress bar', async () => {
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

    expect(container.textContent).toContain('레벨 57');
    expect(container.textContent).toContain('123,456');
    expect(container.textContent).toContain('987,654');
    expect(container.querySelector('[data-experience-level-value="true"]')?.textContent).toBe('57');
    expect(container.querySelector('[data-experience-icon-theme="standard"]')).toBeTruthy();

    const progressbar = container.querySelector('[role="progressbar"]');
    const fill = container.querySelector('[data-testid="experience-bar-fill"]') as HTMLDivElement | null;
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('12');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 123,456 / 987,654 XP');
    expect(fill?.style.width).toBe('12%');
    expect(container.querySelector('[data-testid="experience-ring-fill"]')).toBeNull();
  });

  it('keeps the Dororong experience image centered inside the level mark', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ExperienceWidget
          currentXp={500}
          totalXp={1000}
          level={10}
          visible
          lang="ko"
          iconTheme="dororong"
        />,
      );
    });

    const iconImage = container.querySelector('[data-experience-image="true"]') as HTMLImageElement | null;
    expect(iconImage).toBeTruthy();
    expect(container.querySelector('[data-experience-icon-theme="dororong"]')).toBeTruthy();
    expect(container.textContent).toContain('레벨 10');
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
    const fill = container.querySelector('[data-testid="experience-bar-fill"]') as HTMLDivElement | null;
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('100');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 1,300 / 1,000 XP');
    expect(fill?.style.width).toBe('100%');
  });
});
