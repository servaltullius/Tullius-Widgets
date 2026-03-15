import { useEffect, useState } from 'react';
import { DAYS_IN_MONTH } from '../data/constants';
import { formatSkyrimDateTime, getLanguageLocale } from '../i18n/translations';
import type { Language } from '../types/settings';
import type { GameTimeInfo } from '../types/stats';

export const TIME_WIDGET_VALUE_MAX_WIDTH = 320;

interface NormalizedGameTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function normalizeGameTime(gameTime: GameTimeInfo): NormalizedGameTime {
  const month = clamp(Math.trunc(gameTime.month), 0, 11);
  const maxDay = DAYS_IN_MONTH[month] ?? 31;
  return {
    year: Math.max(1, Math.trunc(gameTime.year)),
    month,
    day: clamp(Math.trunc(gameTime.day), 1, maxDay),
    hour: clamp(Math.trunc(gameTime.hour), 0, 23),
    minute: clamp(Math.trunc(gameTime.minute), 0, 59),
  };
}

function addGameMinutes(base: NormalizedGameTime, minutesToAdd: number): NormalizedGameTime {
  if (minutesToAdd <= 0) {
    return base;
  }

  let year = base.year;
  let month = base.month;
  let day = base.day;
  const totalMinutes = base.hour * 60 + base.minute + minutesToAdd;
  let minuteOfDay = totalMinutes % 1440;
  let dayCarry = Math.floor(totalMinutes / 1440);

  while (dayCarry > 0) {
    const daysInCurrentMonth = DAYS_IN_MONTH[month] ?? 31;
    const remainingDaysThisMonth = daysInCurrentMonth - day;
    if (dayCarry <= remainingDaysThisMonth) {
      day += dayCarry;
      dayCarry = 0;
      break;
    }

    dayCarry -= remainingDaysThisMonth + 1;
    day = 1;
    month += 1;
    if (month >= 12) {
      month = 0;
      year += 1;
    }
  }

  if (minuteOfDay < 0) {
    minuteOfDay += 1440;
  }

  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  return { year, month, day, hour, minute };
}

function advanceGameTime(gameTime: GameTimeInfo, nowMs: number): NormalizedGameTime {
  const base = normalizeGameTime(gameTime);
  const elapsedMs = Math.max(0, nowMs - gameTime.snapshotAtMs);
  const timeScale = Number.isFinite(gameTime.timeScale) ? Math.max(0, gameTime.timeScale) : 0;
  const elapsedGameMinutes = Math.floor((elapsedMs / 60000) * timeScale);
  return addGameMinutes(base, elapsedGameMinutes);
}

const cachedFormatters: Record<string, Intl.DateTimeFormat> = {};

function createDateTimeFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getCachedFormatter(lang: Language): Intl.DateTimeFormat {
  const locale = getLanguageLocale(lang);
  if (cachedFormatters[locale]) {
    return cachedFormatters[locale];
  }

  try {
    cachedFormatters[locale] = createDateTimeFormatter(locale);
  } catch {
    cachedFormatters[locale] = createDateTimeFormatter('en-US');
  }

  return cachedFormatters[locale];
}

export function useSharedTimeWidgetClock(snapshotAtMs: number, enabled = true): number {
  const [nowMs, setNowMs] = useState<number>(snapshotAtMs);

  useEffect(() => {
    setNowMs(snapshotAtMs);
  }, [snapshotAtMs]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return nowMs;
}

export function formatGameDateTime(gameTime: GameTimeInfo, nowMs: number, lang: Language): string {
  const current = advanceGameTime(gameTime, nowMs);
  const hhmm = `${pad2(current.hour)}:${pad2(current.minute)}`;
  return formatSkyrimDateTime(lang, {
    year: current.year,
    month: current.month,
    day: current.day,
    time: hhmm,
  });
}

export function formatRealDateTime(nowMs: number, lang: Language): string {
  return getCachedFormatter(lang).format(new Date(nowMs));
}
