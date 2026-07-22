// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ResistanceWidget } from './ResistanceWidget';

describe('ResistanceWidget', () => {
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

  it('stacks the primary value above the icon and keeps the raw value as a smaller secondary line', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ResistanceWidget
          icon="fire"
          iconColor="#ff6633"
          value={45}
          unit="%"
          visible
          secondaryValue={120}
          secondaryUnit="%"
          tooltip="test"
          iconTheme="dororong"
        />,
      );
    });

    const widget = container.querySelector('[data-resistance-widget="true"]') as HTMLDivElement | null;
    expect(widget).toBeTruthy();
    expect(widget?.style.flexDirection).toBe('column');

    const primary = widget?.querySelector('[data-resistance-primary="true"]') as HTMLSpanElement | null;
    const secondary = widget?.querySelector('[data-resistance-secondary="true"]') as HTMLSpanElement | null;
    const icon = widget?.querySelector('[data-resistance-icon="true"]') as HTMLDivElement | null;
    const iconImage = icon?.querySelector('img[alt="fire"]') as HTMLImageElement | null;

    expect(primary?.textContent).toBe('45%');
    expect(secondary?.textContent).toBe('120%');
    expect(primary?.style.fontFamily).toBe('var(--tw-font-hud)');
    expect(secondary?.style.fontFamily).toBe('var(--tw-font-hud)');
    expect(icon).toBeTruthy();
    expect(iconImage?.style.width).toBe('42px');
    expect(iconImage?.style.height).toBe('42px');
    expect(iconImage?.style.position).toBe('absolute');
    expect(iconImage?.style.left).toBe('-4px');
    expect(iconImage?.style.top).toBe('-4px');
    expect(iconImage?.style.transform).toBe('');

    const children = Array.from(widget?.children ?? []);
    expect(children[0]).toBe(primary);
    expect(children[1]).toBe(secondary);
    expect(children[2]).toBe(icon);
  });

  it('uses a standard glyph instead of a Dororong image by default', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ResistanceWidget
          icon="fire"
          iconColor="#ff6633"
          value={45}
          unit="%"
          visible
        />,
      );
    });

    expect(container.querySelector('img[alt="fire"]')).toBeNull();
    expect(container.querySelector('[data-resistance-icon-fallback="true"] svg')).toBeTruthy();
    expect(container.querySelector('[data-resistance-icon="true"]')?.getAttribute('data-icon-theme')).toBe('standard');
  });
});
