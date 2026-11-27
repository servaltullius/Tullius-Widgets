// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callNative, interceptNativeCalls, isInterceptingNativeCalls } from './nativeCalls';

describe('nativeCalls', () => {
  afterEach(() => {
    delete window.onSettingsChanged;
  });

  it('calls the plugin function when there is one, and says when there is none', () => {
    expect(callNative('onSettingsChanged', '{}')).toBe(false);
    const plugin = vi.fn();
    window.onSettingsChanged = plugin;
    expect(callNative('onSettingsChanged', '{"a":1}')).toBe(true);
    expect(plugin).toHaveBeenCalledWith('{"a":1}');
  });

  it('holds every call while intercepted, and lets them through again once released', () => {
    const plugin = vi.fn();
    window.onSettingsChanged = plugin;
    const held: Array<[string, string]> = [];
    const release = interceptNativeCalls((name, argument) => held.push([name, argument]));
    expect(isInterceptingNativeCalls()).toBe(true);

    // Held even where the plugin has no function: the page counts it as delivered.
    expect(callNative('onSettingsChanged', 'saved')).toBe(true);
    expect(callNative('onEscapeOwner', '1')).toBe(true);
    expect(plugin).not.toHaveBeenCalled();
    expect(held).toEqual([['onSettingsChanged', 'saved'], ['onEscapeOwner', '1']]);

    // Only one holder at a time, so a second run cannot take the calls from the first.
    expect(() => interceptNativeCalls(() => undefined)).toThrow();

    release();
    expect(isInterceptingNativeCalls()).toBe(false);
    callNative('onSettingsChanged', 'after');
    expect(plugin).toHaveBeenCalledWith('after');
  });
});
