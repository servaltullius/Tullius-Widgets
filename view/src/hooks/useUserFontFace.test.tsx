// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeUserFonts, type UserFont } from '../data/userFonts';
import { useUserFontFace } from './useUserFontFace';

const fonts = normalizeUserFonts(JSON.stringify({ fonts: [
  { id: 'A', files: ['Font-Regular.ttf'] },
  { id: 'B', files: ['Font-Bold.otf'] },
] }));
const face = {} as FontFace;

function pendingFaces() {
  let resolve!: (faces: FontFace[]) => void;
  const promise = new Promise<FontFace[]>(complete => { resolve = complete; });
  return { promise, resolve };
}

function Harness({ id, listing, relayout }: { id: string; listing: UserFont[]; relayout: () => void }) {
  const font = useUserFontFace(listing, id, relayout);
  return <output data-status={font.status}>{font.family}</output>;
}

describe('useUserFontFace', () => {
  const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
  let container: HTMLDivElement;
  let root: Root;
  const relayout = vi.fn();

  function setFontSet(load?: FontFaceSet['load']) {
    Object.defineProperty(document, 'fonts', { configurable: true, value: load ? { load } : undefined });
  }

  async function render(id: string, listing = fonts) {
    await act(async () => root.render(<Harness id={id} listing={listing} relayout={relayout} />));
  }

  function status() {
    return container.querySelector('output')?.dataset.status;
  }

  function style() {
    return document.getElementById('tw-user-font');
  }

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    relayout.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else Reflect.deleteProperty(document, 'fonts');
    delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    vi.useRealTimers();
  });

  it('applies the family only after all weights finish and keeps it on an equivalent refresh', async () => {
    const delayed = pendingFaces();
    const load = vi.fn<FontFaceSet['load']>().mockResolvedValue([]).mockReturnValueOnce(delayed.promise).mockResolvedValueOnce([face]);
    setFontSet(load);
    await render('a');
    expect(status()).toBe('loading');
    expect(container.textContent).toBe('');
    expect(load.mock.calls).toEqual([400, 500, 600, 700].map(weight => [`${weight} 16px "TW User Font 1"`, '가Aa1']));
    const originalStyle = style();
    expect(originalStyle?.textContent).toContain('user-fonts/A/Font-Regular.ttf');
    await act(async () => delayed.resolve([]));
    expect(status()).toBe('ready');
    expect(container.textContent).toBe('TW User Font 1');

    await render('A', structuredClone(fonts).reverse());
    expect(load).toHaveBeenCalledTimes(4);
    expect(style()).toBe(originalStyle);
    await render('');
    expect(status()).toBe('none');
    expect(style()).toBeNull();
    await render('Missing');
    expect(status()).toBe('missing');
  });

  it('removes the style when every load result is empty', async () => {
    setFontSet(vi.fn().mockResolvedValue([]));
    await render('A');
    expect(status()).toBe('failed');
    expect(container.textContent).toBe('');
    expect(style()).toBeNull();
  });

  it('falls back when the engine rejects the load', async () => {
    setFontSet(vi.fn().mockRejectedValue(new Error('Font could not be decoded')));
    await render('A');
    expect(status()).toBe('failed');
    expect(style()).toBeNull();
  });

  it('keeps the weights that loaded when another weight fails', async () => {
    const load = vi.fn<FontFaceSet['load']>()
      .mockResolvedValueOnce([face])
      .mockRejectedValueOnce(new Error('Bold file could not be decoded'))
      .mockResolvedValue([face]);
    setFontSet(load);
    await render('A');
    expect(status()).toBe('ready');
    expect(container.textContent).toBe('TW User Font 1');
    expect(style()).not.toBeNull();
  });

  it('keeps a weight that loaded when another weight is still pending at the time limit', async () => {
    vi.useFakeTimers();
    const pending = pendingFaces();
    setFontSet(vi.fn<FontFaceSet['load']>().mockResolvedValueOnce([face]).mockReturnValue(pending.promise));
    await render('A');
    expect(status()).toBe('loading');
    await act(async () => vi.advanceTimersByTime(15000));
    expect(status()).toBe('ready');
    expect(style()).not.toBeNull();
  });

  it('treats a synchronous throw as a failure of that weight only', async () => {
    let call = 0;
    setFontSet(((() => {
      call++;
      if (call === 2) throw new Error('engine threw');
      return Promise.resolve([face]);
    }) as unknown) as FontFaceSet['load']);
    await render('A');
    expect(call).toBe(4);
    expect(status()).toBe('ready');
  });

  it('allows five more seconds for each file of the font', async () => {
    vi.useFakeTimers();
    const twoFiles = normalizeUserFonts(JSON.stringify({ fonts: [{ id: 'Two', files: ['Two-Regular.ttf', 'Two-Bold.ttf'] }] }));
    setFontSet(vi.fn().mockReturnValue(pendingFaces().promise));
    await render('Two', twoFiles);
    await act(async () => vi.advanceTimersByTime(19999));
    expect(status()).toBe('loading');
    await act(async () => vi.advanceTimersByTime(1));
    expect(status()).toBe('failed');
  });

  it('fails after a limit that grows with the file count and ignores a completion after it', async () => {
    vi.useFakeTimers();
    const delayed = pendingFaces();
    setFontSet(vi.fn().mockReturnValue(delayed.promise));
    // Font A has one file: 10s base + 5s per file.
    await render('A');
    await act(async () => vi.advanceTimersByTime(14999));
    expect(status()).toBe('loading');
    await act(async () => vi.advanceTimersByTime(1));
    expect(status()).toBe('failed');
    expect(style()).toBeNull();
    await act(async () => delayed.resolve([face]));
    expect(status()).toBe('failed');
  });

  it('ignores A finishing after B replaces it', async () => {
    const first = pendingFaces();
    const second = pendingFaces();
    setFontSet(vi.fn((request: string) => request.includes('Font 1') ? first.promise : second.promise));
    await render('A');
    await render('B');
    expect(status()).toBe('loading');
    expect(document.querySelectorAll('#tw-user-font')).toHaveLength(1);
    expect(style()?.textContent).toContain('user-fonts/B/Font-Bold.otf');
    await act(async () => second.resolve([face]));
    await act(async () => first.resolve([]));
    expect(status()).toBe('ready');
    expect(container.textContent).toBe('TW User Font 2');
  });

  it('applies immediately without the API and schedules two relayouts', async () => {
    vi.useFakeTimers();
    setFontSet();
    await render('A');
    expect(status()).toBe('ready');
    expect(style()).not.toBeNull();
    await act(async () => vi.advanceTimersByTime(299));
    expect(relayout).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(relayout).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(1200));
    expect(relayout).toHaveBeenCalledTimes(2);
  });

  it('clears prior relayout timers on a new selection and removes the style on unmount', async () => {
    vi.useFakeTimers();
    setFontSet();
    await render('A');
    await act(async () => vi.advanceTimersByTime(200));
    await render('B');
    await act(async () => vi.advanceTimersByTime(100));
    expect(relayout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(2);

    await act(async () => root.unmount());
    expect(style()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(relayout).not.toHaveBeenCalled();
  });
});
