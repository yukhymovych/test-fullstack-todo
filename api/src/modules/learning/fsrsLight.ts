import type { Grade } from './learning.schemas.js';

const DEFAULT_STABILITY_DAYS = 7;
const DEFAULT_DIFFICULTY = 5;

const MIN_STABILITY_DAYS = 0.5;
const MAX_STABILITY_DAYS = 365;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

const INTERVAL_MIN_DAYS = 1;
const INTERVAL_MAX_DAYS = 180;

const STABILITY_MULTIPLIERS: Record<Grade, number> = {
  again: 0.55,
  hard: 1,
  good: 1.25,
  easy: 1.5,
};

const DIFFICULTY_DELTAS: Record<Grade, number> = {
  again: 0.5,
  hard: 0.2,
  good: -0.08,
  easy: -0.18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(lookup.get('year'));
  const month = Number(lookup.get('month'));
  const day = Number(lookup.get('day'));
  const hour = Number(lookup.get('hour'));
  const minute = Number(lookup.get('minute'));
  const second = Number(lookup.get('second'));

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function startOfDayInTimezone(dayKey: string, timezone: string): Date {
  const { year, month, day } = parseDayKey(dayKey);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = getTimezoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offset);
}

export function getDayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function diffDays(dayKeyA: string, dayKeyB: string): number {
  const a = new Date(`${dayKeyA}T00:00:00.000Z`);
  const b = new Date(`${dayKeyB}T00:00:00.000Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / dayMs);
}

interface ScheduleFsrsLightParams {
  grade: Grade;
  timezone: string;
  stabilityDays: number | null | undefined;
  difficulty: number | null | undefined;
  lastReviewedAt: Date | null;
  now?: Date;
}

interface ScheduleFsrsLightResult {
  dueAt: Date;
  intervalDays: number;
  nextStabilityDays: number;
  nextDifficulty: number;
  elapsedDays: number | null;
  todayKey: string;
}

export function scheduleFsrsLight(
  params: ScheduleFsrsLightParams
): ScheduleFsrsLightResult {
  const now = params.now ?? new Date();
  const todayKey = getDayKey(now, params.timezone);
  const lastReviewedKey = params.lastReviewedAt
    ? getDayKey(params.lastReviewedAt, params.timezone)
    : null;

  const elapsedDays = lastReviewedKey ? diffDays(todayKey, lastReviewedKey) : null;

  const stability = clamp(
    params.stabilityDays ?? DEFAULT_STABILITY_DAYS,
    MIN_STABILITY_DAYS,
    MAX_STABILITY_DAYS
  );
  const difficulty = clamp(
    params.difficulty ?? DEFAULT_DIFFICULTY,
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  const nextDifficulty = clamp(
    difficulty + DIFFICULTY_DELTAS[params.grade],
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  const multipliedStability = stability * STABILITY_MULTIPLIERS[params.grade];
  const brakedStability =
    multipliedStability / (1 + 0.06 * (nextDifficulty - DEFAULT_DIFFICULTY));
  const nextStabilityDays = clamp(
    brakedStability,
    MIN_STABILITY_DAYS,
    MAX_STABILITY_DAYS
  );

  const intervalDays = clamp(
    Math.round(nextStabilityDays),
    INTERVAL_MIN_DAYS,
    INTERVAL_MAX_DAYS
  );

  const dueDayKey = addDaysToDayKey(todayKey, intervalDays);
  const dueAt = startOfDayInTimezone(dueDayKey, params.timezone);

  return {
    dueAt,
    intervalDays,
    nextStabilityDays,
    nextDifficulty,
    elapsedDays,
    todayKey,
  };
}
