// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CustomSelect, Segmented, Toggle } from './SettingsControls';
import { setHotkeyCaptureActive } from '../../utils/hotkeys';

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

const SELECT_OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
  { value: 'd', label: 'Delta' },
];

function pressKey(key: string, init: KeyboardEventInit = {}) {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function selectMenu(testId: string) {
  return document.querySelector<HTMLElement>(`[data-select-menu="${testId}"]`);
}

function activeOptionValue(testId: string) {
  return selectMenu(testId)?.querySelector<HTMLElement>('[data-active="true"]')?.dataset.testid?.replace(`${testId}-option-`, '');
}

it('opens a select from its trigger with the arrow keys and picks with Enter', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<CustomSelect value="b" options={SELECT_OPTIONS} onChange={onChange} testId="kb" />);
    const trigger = container.querySelector<HTMLButtonElement>('[data-testid="kb"]')!;
    trigger.focus();

    await act(async () => pressKey('ArrowDown'));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Opens on the chosen option, not the first.
    expect(activeOptionValue('kb')).toBe('b');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(selectMenu('kb')!.querySelector('[data-active="true"]')!.id);

    await act(async () => pressKey('ArrowDown'));
    await act(async () => pressKey('ArrowDown', { repeat: true }));
    expect(activeOptionValue('kb')).toBe('d');
    // Stops at the ends instead of wrapping.
    await act(async () => pressKey('ArrowDown'));
    expect(activeOptionValue('kb')).toBe('d');
    await act(async () => pressKey('Home'));
    expect(activeOptionValue('kb')).toBe('a');
    await act(async () => pressKey('ArrowUp'));
    expect(activeOptionValue('kb')).toBe('a');
    await act(async () => pressKey('End'));
    expect(activeOptionValue('kb')).toBe('d');
    await act(async () => pressKey('ArrowUp'));
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => pressKey('Enter'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('c');
    expect(selectMenu('kb')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

it('opens and picks with Space, ignores a held key and lets the pointer move the active option', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<CustomSelect value="a" options={SELECT_OPTIONS} onChange={onChange} testId="kb" />);
    const trigger = container.querySelector<HTMLButtonElement>('[data-testid="kb"]')!;
    trigger.focus();

    let opening: KeyboardEvent | null = null;
    await act(async () => {
      opening = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      trigger.dispatchEvent(opening);
    });
    // The default is prevented so the key release does not click the trigger and close it again.
    expect(opening!.defaultPrevented).toBe(true);
    expect(selectMenu('kb')).not.toBeNull();

    await act(async () => pressKey(' ', { repeat: true }));
    expect(onChange).not.toHaveBeenCalled();
    expect(selectMenu('kb')).not.toBeNull();

    const gamma = selectMenu('kb')!.querySelector<HTMLElement>('[data-testid="kb-option-c"]')!;
    await act(async () => gamma.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })));
    expect(activeOptionValue('kb')).toBe('c');

    await act(async () => pressKey(' '));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('c');
    expect(selectMenu('kb')).toBeNull();
  });
});

it('takes the menu keys while open even when the focus left the trigger, and Tab or Esc close it unchanged', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    const onOutsideKey = vi.fn();
    window.addEventListener('keydown', onOutsideKey);
    try {
      await render(<CustomSelect value="a" options={SELECT_OPTIONS} onChange={onChange} testId="kb" />);
      const trigger = container.querySelector<HTMLButtonElement>('[data-testid="kb"]')!;
      await act(async () => trigger.click());
      trigger.blur();

      await act(async () => pressKey('ArrowDown'));
      expect(activeOptionValue('kb')).toBe('b');
      // Nothing behind the menu sees the keys it answered.
      expect(onOutsideKey).not.toHaveBeenCalled();

      await act(async () => pressKey('Tab'));
      expect(selectMenu('kb')).toBeNull();
      expect(onOutsideKey).toHaveBeenCalledTimes(1);

      // Reopening starts from the chosen option again.
      await act(async () => trigger.click());
      expect(activeOptionValue('kb')).toBe('a');
      await act(async () => pressKey('ArrowDown'));
      await act(async () => pressKey('Escape'));
      expect(selectMenu('kb')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();

      // Closed, the menu keys belong to the page again.
      onOutsideKey.mockClear();
      await act(async () => pressKey('ArrowDown'));
      expect(onOutsideKey).toHaveBeenCalledTimes(1);
      expect(selectMenu('kb')).toBeNull();
    } finally {
      window.removeEventListener('keydown', onOutsideKey);
    }
  });
});

it('keeps the active option inside a scrolled menu', async () => {
  await withRoot(async (container, render) => {
    const options = Array.from({ length: 20 }, (_, i) => ({ value: String(i), label: `Option ${i}` }));
    const offsetTop = vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      return Number(this.dataset.optionIndex ?? 0) * 30;
    });
    const offsetHeight = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
    const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(90);
    try {
      await render(<CustomSelect value="0" options={options} onChange={vi.fn()} testId="scroll" />);
      const trigger = container.querySelector<HTMLButtonElement>('[data-testid="scroll"]')!;
      trigger.focus();
      await act(async () => pressKey('ArrowDown'));
      const menu = selectMenu('scroll')!;
      expect(menu.scrollTop).toBe(0);

      await act(async () => pressKey('End'));
      expect(menu.scrollTop).toBe(19 * 30 + 30 - 90);
      await act(async () => pressKey('Home'));
      expect(menu.scrollTop).toBe(0);

      // A wheel scroll moves the list away from the active option; the scroll also sets the menu's
      // position again, which must not pull the list back.
      menu.scrollTop = 300;
      await act(async () => menu.dispatchEvent(new Event('scroll')));
      expect(menu.scrollTop).toBe(300);

      // Home on the option that is already active still brings it back into view.
      await act(async () => pressKey('Home'));
      expect(menu.scrollTop).toBe(0);
    } finally {
      offsetTop.mockRestore();
      offsetHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });
});

it('leaves the keys to a hotkey button waiting for a key while a menu is open', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<CustomSelect value="a" options={SELECT_OPTIONS} onChange={onChange} testId="kb" />);
    const trigger = container.querySelector<HTMLButtonElement>('[data-testid="kb"]')!;
    await act(async () => trigger.click());
    setHotkeyCaptureActive(true);
    try {
      await act(async () => pressKey('ArrowDown'));
      await act(async () => pressKey('Enter'));
      expect(activeOptionValue('kb')).toBe('a');
      expect(onChange).not.toHaveBeenCalled();
      expect(selectMenu('kb')).not.toBeNull();
    } finally {
      setHotkeyCaptureActive(false);
    }
    await act(async () => pressKey('ArrowDown'));
    expect(activeOptionValue('kb')).toBe('b');
  });
});

it('keeps pointing at the same option when the list changes while the menu is open', async () => {
  await withRoot(async (container, render) => {
    const onChange = vi.fn();
    await render(<CustomSelect value="b" options={SELECT_OPTIONS} onChange={onChange} testId="kb" />);
    container.querySelector<HTMLButtonElement>('[data-testid="kb"]')!.focus();
    await act(async () => pressKey('ArrowDown'));
    expect(activeOptionValue('kb')).toBe('b');

    // A new option arrives ahead of it, as user fonts can.
    await render(
      <CustomSelect value="b" options={[{ value: 'new', label: 'New' }, ...SELECT_OPTIONS]} onChange={onChange} testId="kb" />,
    );
    expect(activeOptionValue('kb')).toBe('b');
    await act(async () => pressKey('Enter'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b');
  });
});

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
