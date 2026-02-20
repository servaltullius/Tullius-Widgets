import { useEffect, useMemo, useState } from 'react';
import type { GameTimeInfo } from '../types/stats';
import { StatWidget } from './StatWidget';

interface TimeWidgetListProps {
  gameTime: GameTimeInfo;
  showGameDateTime: boolean;
  showRealDateTime: boolean;
  lang: 'ko' | 'en';
}

const SKYRIM_MONTH_NAMES = [
  'Morning Star',
  "Sun's Dawn",
  'First Seed',
  "Rain's Hand",
  'Second Seed',
  'Midyear',
  "Sun's Height",
  'Last Seed',
  'Hearthfire',
  'Frostfall',
  "Sun's Dusk",
  'Evening Star',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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

function resolveMonthName(gameTime: GameTimeInfo, month: number): string {
  if (month === clamp(Math.trunc(gameTime.month), 0, 11) && gameTime.monthName) {
    return gameTime.monthName;
  }
  return SKYRIM_MONTH_NAMES[month] ?? gameTime.monthName ?? 'Unknown';
}

function formatGameDateTime(gameTime: GameTimeInfo, nowMs: number, lang: 'ko' | 'en'): string {
  const current = advanceGameTime(gameTime, nowMs);
  const monthName = resolveMonthName(gameTime, current.month);
  const hhmm = `${pad2(current.hour)}:${pad2(current.minute)}`;

  if (lang === 'ko') {
    return `4E ${current.year} ${monthName} ${current.day}일 ${hhmm}`;
  }
  return `4E ${current.year}, ${monthName} ${current.day} ${hhmm}`;
}

function formatRealDateTime(nowMs: number, lang: 'ko' | 'en'): string {
  const formatter = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date(nowMs));
}

export function TimeWidgetList({ gameTime, showGameDateTime, showRealDateTime, lang }: TimeWidgetListProps) {
  const [nowMs, setNowMs] = useState<number>(gameTime.snapshotAtMs);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const gameDateTime = useMemo(() => formatGameDateTime(gameTime, nowMs, lang), [gameTime, nowMs, lang]);
  const realDateTime = useMemo(() => formatRealDateTime(nowMs, lang), [nowMs, lang]);

  return (
    <>
      <StatWidget icon="gameTime" iconColor="#d8b96b" value={gameDateTime} visible={showGameDateTime} />
      <StatWidget icon="realTime" iconColor="#77d8ff" value={realDateTime} visible={showRealDateTime} />
    </>
  );
}
