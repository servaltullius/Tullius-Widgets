// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markFontsReadyWhenLoaded } from './fontsReady';

describe('markFontsReadyWhenLoaded', () => {
  afterEach(() => {
    vi.useRealTimers();
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
