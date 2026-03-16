import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../data/defaultSettings';
import {
  acceptIncomingSettingsRevision,
  mergeWithDefaults,
  warnFutureSettingsSchemaVersion,
} from './settingsSchema';

describe('settingsSchema', () => {
  it('defaults the standalone level widget off for fresh stage 2 installs', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 4,
    });

    expect(defaultSettings.playerInfo.level).toBe(false);
    expect(merged.playerInfo.level).toBe(false);
  });

  it('preserves standalone level visibility for legacy payloads without explicit level flags', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 3,
      playerInfo: {
        gold: false,
      },
    }, {
      allowLegacyStandaloneLevelFallback: true,
    });

    expect(merged.playerInfo.level).toBe(true);
  });

  it('keeps standalone level off for schema-less partial payloads by default', () => {
    const merged = mergeWithDefaults({
      playerInfo: {
        gold: false,
      },
    });

    expect(merged.playerInfo.level).toBe(false);
  });

  it('keeps standalone level hidden for legacy payloads that explicitly disable it', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 3,
      playerInfo: {
        level: false,
      },
    }, {
      allowLegacyStandaloneLevelFallback: true,
    });

    expect(merged.playerInfo.level).toBe(false);
  });

  it('preserves standalone level visibility for invalid-schema legacy imports when fallback is allowed', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 'invalid',
      playerInfo: {
        gold: false,
      },
    }, {
      allowLegacyStandaloneLevelFallback: true,
    });

    expect(merged.playerInfo.level).toBe(true);
  });

  it('prefers canonical item visibility when legacy player level flags conflict', () => {
    const merged = mergeWithDefaults({
      schemaVersion: 3,
      playerInfo: {
        level: true,
      },
      itemLayouts: {
        'player.level': { visible: false, x: 120, y: 240, scale: 1.1 },
      },
    }, {
      allowLegacyStandaloneLevelFallback: true,
    });

    expect(merged.playerInfo.level).toBe(false);
    expect(merged.itemLayouts['player.level']).toMatchObject({
      visible: false,
    });
  });

  it('preserves valid display-mode enum values', () => {
    const merged = mergeWithDefaults({
      timedEffects: {
        listLayout: 'horizontal',
      },
      playerInfo: {
        carryWeightDisplay: 'meterOnly',
      },
      resistances: {
        displayMode: 'rawOnly',
      },
      time: {
        gameDisplay: 'timeOnly',
        realDisplay: 'timeOnly',
      },
    });

    expect(merged.timedEffects).toMatchObject({
      listLayout: 'horizontal',
    });
    expect(merged.playerInfo).toMatchObject({
      carryWeightDisplay: 'meterOnly',
    });
    expect(merged.resistances).toMatchObject({
      displayMode: 'rawOnly',
    });
    expect(merged.time).toMatchObject({
      gameDisplay: 'timeOnly',
      realDisplay: 'timeOnly',
    });
  });

  it('falls back to defaults for invalid display-mode enum values', () => {
    const merged = mergeWithDefaults({
      timedEffects: {
        listLayout: 'grid',
      },
      playerInfo: {
        carryWeightDisplay: 'percentOnly',
      },
      resistances: {
        displayMode: 'effectiveAndRaw',
      },
      time: {
        gameDisplay: 'clockOnly',
        realDisplay: 123,
      },
    });

    expect(merged.timedEffects).toMatchObject({
      listLayout: 'vertical',
    });
    expect(merged.playerInfo).toMatchObject({
      carryWeightDisplay: 'combined',
    });
    expect(merged.resistances).toMatchObject({
      displayMode: 'both',
    });
    expect(merged.time).toMatchObject({
      gameDisplay: 'dateTime',
      realDisplay: 'dateTime',
    });
  });

  it('merges older payloads safely when display-mode fields are missing', () => {
    const merged = mergeWithDefaults({
      timedEffects: {
        enabled: false,
      },
      playerInfo: {
        carryWeight: false,
      },
      resistances: {
        fire: false,
      },
      time: {
        gameDateTime: false,
        realDateTime: false,
      },
    });

    expect(merged.timedEffects).toMatchObject({
      enabled: false,
      listLayout: 'vertical',
    });
    expect(merged.playerInfo).toMatchObject({
      carryWeight: false,
      carryWeightDisplay: 'combined',
    });
    expect(merged.resistances).toMatchObject({
      fire: false,
      displayMode: 'both',
    });
    expect(merged.time).toMatchObject({
      gameDateTime: false,
      gameDisplay: 'dateTime',
      realDateTime: false,
      realDisplay: 'dateTime',
    });
  });

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
        'time.real': { visible: false, x: 640, y: 40, scale: 0.9, locked: true, zIndex: 21 },
        brokenScale: { visible: true, x: 0, y: 0, scale: 0 },
        brokenShape: 10,
      },
    });

    expect(merged.itemLayouts).toEqual({
      'player.level': { visible: true, x: 120, y: 240, scale: 1.4, locked: false, zIndex: 1 },
      'time.real': { visible: false, x: 640, y: 40, scale: 0.9, locked: true, zIndex: 21 },
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
