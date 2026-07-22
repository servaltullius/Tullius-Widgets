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

  it('renders image-backed icon badges as restrained clipped glyph plates', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StatWidget
          icon="health"
          iconColor="#e84040"
          value={330}
          visible
          iconTheme="dororong"
          showIconBadge
        />,
      );
    });

    const badge = container.querySelector('[data-stat-icon-badge="true"]') as HTMLDivElement | null;
    const glyph = badge?.querySelector('svg');

    expect(badge).toBeTruthy();
    expect(badge?.classList.contains('tw-stat-icon-badge')).toBe(true);
    expect(glyph?.getAttribute('stroke')).toBe('currentColor');
    expect(glyph?.getAttribute('stroke-width')).toBe('2.1');
  });

  it('can hide overlay badges while keeping Dororong image icons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StatWidget
          icon="health"
          iconColor="#e84040"
          value={330}
          visible
          iconTheme="dororong"
          showIconBadge={false}
        />,
      );
    });

    expect(container.querySelector('img[alt="health"]')).toBeTruthy();
    expect(container.querySelector('[data-stat-icon-badge="true"]')).toBeNull();
  });

  it('uses a semantic-color clipped glyph frame by default', async () => {
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

    const widget = container.querySelector('[data-stat-widget="true"]') as HTMLDivElement | null;
    const frame = container.querySelector('[data-stat-icon-fallback="true"]') as HTMLDivElement | null;
    const glyph = frame?.querySelector('svg');

    expect(container.querySelector('img[alt="health"]')).toBeNull();
    expect(widget?.classList.contains('tw-stat-widget--numeric')).toBe(true);
    expect(frame?.classList.contains('tw-stat-icon-frame')).toBe(true);
    expect(glyph?.getAttribute('stroke')).toBe('currentColor');
    expect(frame?.getAttribute('data-icon-theme')).toBe('standard');
    expect(frame?.getAttribute('data-standard-icon')).toBe('health');
    expect(widget?.style.getPropertyValue('--tw-icon-color')).toBe('#e84040');
    expect(widget?.style.getPropertyValue('--tw-icon-accent')).toBe('rgba(232, 64, 64, 0.88)');
    expect(widget?.style.getPropertyValue('--tw-icon-border')).toBe('rgba(232, 64, 64, 0.46)');
    expect(widget?.style.getPropertyValue('--tw-icon-tint')).toBe('rgba(232, 64, 64, 0.16)');
  });

  it('can use a distinct standard icon without replacing the Dororong asset key', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StatWidget
          icon="rightHand"
          standardIcon="rightHandEquipped"
          iconColor="#e85050"
          value="검"
          visible
          iconTheme="dororong"
        />,
      );
    });

    const frame = container.querySelector('[data-stat-icon="true"]');
    expect(container.querySelector('img[alt="rightHand"]')).toBeTruthy();
    expect(frame?.getAttribute('data-standard-icon')).toBe('rightHandEquipped');
  });

  it('keeps text values on the wider independent widget treatment', async () => {
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

    const widget = container.querySelector('[data-stat-widget="true"]');
    expect(widget?.classList.contains('tw-stat-widget--text')).toBe(true);
    expect(widget?.classList.contains('tw-stat-widget--secondary')).toBe(true);
    expect(container.querySelector('[data-stat-value="true"]')?.textContent).toBe('4E 201');
  });
});
