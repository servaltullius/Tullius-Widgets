import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';

describe('settingsSchema', () => {
  it('drops invalid positions while preserving valid widget coordinates', () => {
    const merged = mergeWithDefaults({
      positions: {
        playerInfo: { x: 120, y: 240 },
        brokenA: { x: 'bad', y: 10 },
        brokenB: 10,
      },
    });

    expect(merged.positions).toEqual({
      playerInfo: { x: 120, y: 240 },
    });
  });

  it('accepts finite positive group scales while dropping invalid values', () => {
    const merged = mergeWithDefaults({
      groupScales: {
        playerInfo: 1.25,
        offense: 2,
        unknownGroup: 1.75,
        zero: 0,
        negative: -1,
        infinite: Infinity,
        nan: Number.NaN,
        text: 'bad',
      },
    });

    expect(merged.groupScales).toEqual({
      playerInfo: 1.25,
      offense: 2,
      unknownGroup: 1.75,
    });
  });

  it('accepts schema v2 item layouts while dropping invalid entries', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 2,
      itemLayouts: {
        'player.level': { visible: true, x: 120, y: 240, scale: 1.4 },
        'time.real': { visible: false, x: 640, y: 40, scale: 0.9 },
        brokenScale: { visible: true, x: 0, y: 0, scale: 0 },
        brokenShape: 10,
      },
    });

    expect(merged.itemLayouts).toEqual({
      'player.level': { visible: true, x: 120, y: 240, scale: 1.4 },
      'time.real': { visible: false, x: 640, y: 40, scale: 0.9 },
    });
  });

  it('keeps legacy layout fields readable when schema v1 payload has no item layouts', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 1,
      positions: {
        playerInfo: { x: 120, y: 240 },
      },
      layouts: {
        offense: 'horizontal',
        broken: 'diagonal',
      },
      groupScales: {
        playerInfo: 1.25,
        broken: 0,
      },
    });

    expect(merged.positions).toEqual({
      playerInfo: { x: 120, y: 240 },
    });
    expect(merged.layouts).toEqual({
      offense: 'horizontal',
    });
    expect(merged.groupScales).toEqual({
      playerInfo: 1.25,
    });
    expect(merged.itemLayouts).toEqual({});
  });

  it('treats missing group scales as optional schema v1 data', () => {
    const merged = mergeWithDefaults({
      general: {
        opacity: 55,
      },
    });

    expect(merged.groupScales).toEqual({});
    expect(merged.itemLayouts).toEqual({});
    expect(merged.general.opacity).toBe(55);
  });

  it('preserves custom language codes for external localization packs', () => {
    const merged = mergeWithDefaults({
      general: {
        language: 'fr',
      },
    });

    expect(merged.general.language).toBe('fr');
  });

  it('warns only once for future schema version payloads', () => {
    const warnedFutureSettingsSchemaRef = { current: false };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnFutureSettingsSchemaVersion({ schemaVersion: 99 }, warnedFutureSettingsSchemaRef);
    warnFutureSettingsSchemaVersion({ schemaVersion: 100 }, warnedFutureSettingsSchemaRef);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects stale incoming revisions', () => {
    const lastAppliedSettingsRevisionRef = { current: 5 };
    const settingsRevisionRef = { current: 5 };

    const accepted = acceptIncomingSettingsRevision(
      { ...defaultSettings, rev: 4 },
      lastAppliedSettingsRevisionRef,
      settingsRevisionRef,
    );

    expect(accepted).toBe(false);
    expect(settingsRevisionRef.current).toBe(5);
  });
});
