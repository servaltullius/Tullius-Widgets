// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StatWidget } from './StatWidget';

describe('StatWidget', () => {
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

  it('keeps overlay badges visibly filled for image-backed icons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StatWidget
          icon="health"
          iconColor="#e84040"
          value={330}
          visible
        />,
      );
    });

    const badge = container.querySelector('[data-stat-icon-badge="true"]') as HTMLDivElement | null;
    const accent = container.querySelector('[data-stat-icon-badge-accent="true"]') as HTMLDivElement | null;
    const glyph = badge?.querySelector('svg');

    expect(badge).toBeTruthy();
    expect(badge?.style.background).toContain('linear-gradient');
    expect(badge?.style.boxShadow).toContain('rgba(232, 64, 64, 0.5)');
    expect(accent).toBeTruthy();
    expect(accent?.style.background).toContain('radial-gradient');
    expect(glyph?.getAttribute('stroke')).toBe('#ffffff');
    expect(glyph?.getAttribute('stroke-width')).toBe('2.5');
    expect(glyph?.style.filter).toContain('drop-shadow');
  });

  it('uses the same contrast treatment for lucide-only fallback icons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StatWidget
          icon="gameTime"
          iconColor="#d8b96b"
          value="4E 201"
          visible
          prominence="secondary"
        />,
      );
    });

    const fallback = container.querySelector('[data-stat-icon-fallback="true"]') as HTMLDivElement | null;
    const glyph = fallback?.querySelector('svg');

    expect(fallback).toBeTruthy();
    expect(fallback?.style.background).toContain('linear-gradient');
    expect(fallback?.style.boxShadow).toContain('rgba(216, 185, 107, 0.5)');
    expect(glyph?.getAttribute('stroke')).toBe('#ffffff');
    expect(glyph?.style.filter).toContain('drop-shadow');
  });
});
