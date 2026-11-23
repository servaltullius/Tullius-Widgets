// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CustomSelect } from './SettingsControls';

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
