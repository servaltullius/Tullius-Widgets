// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CustomSelect, Segmented, Toggle } from './SettingsControls';

it('keeps a long CustomSelect menu inside the viewport and scrolls single-line options', async () => {
  const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const options = Array.from({ length: 36 }, (_, i) => ({ value: String(i), label: `User font ${i} ${'W'.repeat(180)}` }));
  const onChange = vi.fn();
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
  try {
    // Put the anchor close to the bottom and right edges.
    rect.mockReturnValue(new DOMRect(window.innerWidth - 82, window.innerHeight - 82, 78, 40));
    await act(async () => root.render(<CustomSelect value="0" options={options} onChange={onChange} testId="long-select" />));
    await act(async () => container.querySelector<HTMLElement>('[data-testid="long-select"]')!.click());
    const menu = document.querySelector<HTMLElement>('[data-select-menu="long-select"]')!;
    const lastOption = menu.querySelector<HTMLElement>('[data-testid="long-select-option-35"]')!;
    expect(menu.style.overflowY).toBe('auto');
    expect(Number.parseFloat(menu.style.maxHeight)).toBeLessThan(options.length * 48);
    expect(Number.parseFloat(menu.style.maxHeight) + Number.parseFloat(menu.style.bottom)).toBe(window.innerHeight - 4);
    expect(Number.parseFloat(menu.style.maxWidth) + Number.parseFloat(menu.style.right)).toBe(window.innerWidth - 4);
    expect(lastOption.style.whiteSpace).toBe('nowrap');
    expect(lastOption.style.overflow).toBe('hidden');
    expect(lastOption.style.textOverflow).toBe('ellipsis');
    expect(lastOption.title).toBe(options[35].label);
    await act(async () => lastOption.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith('35');
  } finally {
    await act(async () => root.unmount());
    rect.mockRestore();
    container.remove();
    delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
});

async function withRoot(run: (container: HTMLDivElement, render: (node: React.ReactNode) => Promise<void>) => Promise<void>) {
  const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await run(container, async node => act(async () => root.render(node)));
  } finally {
    await act(async () => root.unmount());
    container.remove();
    delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
}

const SEGMENT_OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
];

it('selects a segment by click, passes the selected one on again and moves with arrow keys', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<Segmented value="a" options={SEGMENT_OPTIONS} onChange={onChange} ariaLabel="Mode" testId="mode" />);

    const group = container.querySelector<HTMLElement>('[data-testid="mode"]')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Mode');
    const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    expect(radios.map(radio => radio.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radios.map(radio => radio.tabIndex)).toEqual([0, -1, -1]);

    // Picking the current option again reaches the owner, which saves again after a failed save.
    await act(async () => container.querySelector<HTMLElement>('[data-testid="mode-option-a"]')!.click());
    expect(onChange).toHaveBeenLastCalledWith('a');
    await act(async () => container.querySelector<HTMLElement>('[data-testid="mode-option-c"]')!.click());
    expect(onChange).toHaveBeenLastCalledWith('c');

    await act(async () => group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(radios[1]);
    await act(async () => group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    expect(onChange).toHaveBeenLastCalledWith('c');
  });
});

it('changes a switch once per click on its label text', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<Toggle label="Show" checked={false} onChange={onChange} help="Help text" />);

    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(input.getAttribute('role')).toBe('switch');
    await act(async () => container.querySelector<HTMLElement>('.tw-p-label')!.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(container.textContent).toContain('Help text');
  });
});
