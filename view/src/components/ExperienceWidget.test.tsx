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

    expect(container.textContent).toContain('레벨 57 · 123,456 / 987,654');
    expect(container.textContent).not.toContain('12%');
    const iconImage = container.querySelector('img[src*="experience"]');
    expect(iconImage).toBeTruthy();
    expect((iconImage as HTMLImageElement | null)?.style.objectFit).toBe('cover');
    expect((iconImage as HTMLImageElement | null)?.style.objectPosition).toBe('center 42%');
    expect((iconImage as HTMLImageElement | null)?.style.transform).toBe('');
    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar?.textContent).toBe('');
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('12');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 123,456 / 987,654 XP');
    const ringFill = container.querySelector('[data-testid="experience-ring-fill"]');
    expect(ringFill).toBeTruthy();
    const dashArray = Number.parseFloat(ringFill?.getAttribute('stroke-dasharray')?.split(' ')[0] ?? '0');
    const dashOffset = Number.parseFloat(ringFill?.getAttribute('stroke-dashoffset') ?? '0');
    expect(dashArray).toBeGreaterThan(0);
    expect(dashOffset).toBeGreaterThan(0);
    expect(dashOffset).toBeLessThan(dashArray);
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
    expect(container.textContent).toContain('레벨 1 · 1,300 / 1,000');
    expect(container.textContent).not.toContain('100%');
    expect(progressbar?.getAttribute('title')).toContain('경험치 진행도: 1,300 / 1,000 XP');
    const ringFill = container.querySelector('[data-testid="experience-ring-fill"]');
    expect(ringFill).toBeTruthy();
    const dashOffset = Number.parseFloat(ringFill?.getAttribute('stroke-dashoffset') ?? '1');
    expect(dashOffset).toBeCloseTo(0, 3);
  });
});
