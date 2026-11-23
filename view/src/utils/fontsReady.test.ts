// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FONTS_READY_EVENT, markFontsReadyWhenLoaded } from './fontsReady';

describe('markFontsReadyWhenLoaded', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the flag once so a user font relayout can follow it', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const listener = vi.fn();
    window.addEventListener(FONTS_READY_EVENT, listener);
    markFontsReadyWhenLoaded(root);
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(2000);
    window.removeEventListener(FONTS_READY_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('flags the document even when the Font Loading API is missing', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    markFontsReadyWhenLoaded(root);
    expect(root.classList.contains('tw-fonts-ready')).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(root.classList.contains('tw-fonts-ready')).toBe(true);
  });
});
