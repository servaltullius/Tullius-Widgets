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

  it('uses one horizontal grammar for icon, label, effective value, and raw value', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ResistanceWidget
          icon="fire"
          iconColor="#ff6633"
          label="화염"
          value={45}
          unit="%"
          visible
          secondaryValue={120}
          secondaryUnit="%"
          secondaryLabel="원본"
          tooltip="test"
          iconTheme="dororong"
        />,
      );
    });

    const widget = container.querySelector('[data-resistance-widget="true"]') as HTMLDivElement | null;
    const icon = widget?.querySelector('[data-resistance-icon="true"]') as HTMLDivElement | null;
    const iconImage = icon?.querySelector('img[alt="fire"]') as HTMLImageElement | null;

    expect(widget?.classList.contains('tw-resistance-widget')).toBe(true);
    expect(widget?.querySelector('[data-resistance-label="true"]')?.textContent).toBe('화염');
    expect(widget?.querySelector('[data-resistance-primary="true"]')?.textContent).toBe('45%');
    expect(widget?.querySelector('[data-resistance-secondary="true"]')?.textContent).toBe('원본 120%');
    expect(iconImage?.style.width).toBe('38px');
    expect(iconImage?.style.height).toBe('38px');
    expect(iconImage?.style.left).toBe('-4px');
    expect(iconImage?.style.top).toBe('-4px');
  });

  it('uses a semantic-color clipped glyph frame by default', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ResistanceWidget
          icon="fire"
          iconColor="#ff6633"
          label="Fire"
          value={45}
          unit="%"
          visible
        />,
      );
    });

    const frame = container.querySelector('[data-resistance-icon-fallback="true"]') as HTMLDivElement | null;
    expect(container.querySelector('img[alt="fire"]')).toBeNull();
    expect(frame?.classList.contains('tw-resistance-icon-frame')).toBe(true);
    expect(frame?.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor');
    expect(frame?.getAttribute('data-icon-theme')).toBe('standard');
    expect(frame?.getAttribute('data-standard-icon')).toBe('fire');
    const widget = container.querySelector('[data-resistance-widget="true"]') as HTMLDivElement | null;
    expect(widget?.style.getPropertyValue('--tw-icon-color')).toBe('#ff6633');
    expect(widget?.style.getPropertyValue('--tw-icon-tint')).toBe('rgba(255, 102, 51, 0.16)');
  });
});
