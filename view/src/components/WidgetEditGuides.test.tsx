// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WidgetEditGuides } from './WidgetEditGuides';

describe('WidgetEditGuides', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
  });

  it('renders alignment guides only when visible', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <WidgetEditGuides
          visible
          guides={[
            { orientation: 'vertical', position: 120 },
            { orientation: 'horizontal', position: 80 },
          ]}
        />,
      );
    });

    expect(container.querySelectorAll('[data-guide-line]').length).toBe(2);
  });

  it('renders nothing when hidden or empty', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<WidgetEditGuides visible={false} guides={[]} />);
    });

    expect(container.querySelector('[data-guide-line]')).toBeNull();
  });
});
