/**
 * Next reminder instants: IANA zone + local HH:mm → UTC, without naive +24h UTC jumps.
 *
 * ## `REMINDER_ALLOW_MULTIPLE_PER_DAY` (env)
 * - **false (default):** one scheduled notification per **local calendar day**. Scheduling uses wall-clock
 *   HH:mm in the user's zone for the next eligible day. After a successful send, the next fire is the
 *   **next local day** at that same wall time (`computeNextReminderUtcAfterSuccessfulSend`).
 * - **true:** after at least one send has been recorded for **today's** local day, further reminders are
 *   **interval-based only**: `next = now + REMINDER_REPEAT_GAP_MS` (see `computeStoredNextReminderUtc` /
 *   `computeNextReminderUtcAfterSuccessfulSend`). They are **no longer anchored** to HH:mm until the local
 *   day rolls — first delivery of a local day may still use wall-clock scheduling via stored `next_reminder_at_utc`.
 *
 * Wall-clock resolution uses Luxon (tzdata).
 * **Fast path:** `DateTime.fromObject({ year, month, day, hour, minute })` when `.isValid` and the formatted
 * civil date matches `localDayKey`. Safe for normal days; invalid when the wall time does not exist (gap) or when
 * `fromObject` resolves ambiguous local times differently than “first matching minute scan”.
 * **Fallback:** minute increments from `startOf('day')` — deterministic for gap (first minute with
 * `lm >= target`) and overlap (scan order picks the earliest UTC instant matching the civil day constraint).
 *
 * Performance: typically one Luxon conversion; fallback at most ~36×60 minute steps per call (scheduling only).
 */

import { DateTime } from 'luxon';
import {
  getDayKeyForDate,
  normalizeReminderTimeLocal,
  normalizeTimezone,
  parseReminderTimeLocal,
} from './reminderSchedule.js';

function parseDayKeyParts(dayKey: string): { year: number; month: number; day: number } {
  const [ys, ms, ds] = dayKey.split('-');
  return { year: Number(ys), month: Number(ms), day: Number(ds) };
}

/** Gregorian next civil date as en-CA string. */
export function nextCalendarDayKey(dayKey: string): string {
  const { year, month, day } = parseDayKeyParts(dayKey);
  const utc = Date.UTC(year, month - 1, day);
  const d = new Date(utc);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const MAX_LOCAL_MINUTE_OFFSET = 36 * 60;

/**
 * Earliest UTC instant on civil `localDayKey` where local clock is >= hour:minute that day.
 */
export function utcInstantAtOrAfterLocalWallClockOnDay(params: {
  localDayKey: string;
  hour: number;
  minute: number;
  timezone: string;
}): Date | null {
  const { localDayKey, hour, minute, timezone } = params;
  const { year, month, day } = parseDayKeyParts(localDayKey);
  const targetMin = hour * 60 + minute;

  const exact = DateTime.fromObject(
    {
      year,
      month,
      day,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    },
    { zone: timezone }
  );

  if (
    exact.isValid &&
    exact.toFormat('yyyy-MM-dd') === localDayKey &&
    exact.hour * 60 + exact.minute >= targetMin
  ) {
    return exact.toUTC().toJSDate();
  }

  /* Fallback required: e.g. spring-forward hole for this wall time, or edge mismatch vs civil day string. */

  const sod = DateTime.fromObject({ year, month, day }, { zone: timezone }).startOf('day');
  if (!sod.isValid) return null;

  for (let dm = targetMin; dm < targetMin + MAX_LOCAL_MINUTE_OFFSET; dm += 1) {
    const cand = sod.plus({ minutes: dm });
    if (!cand.isValid) continue;
    if (cand.toFormat('yyyy-MM-dd') !== localDayKey) continue;
    const lm = cand.hour * 60 + cand.minute;
    if (lm >= targetMin) {
      return cand.toUTC().toJSDate();
    }
  }

  return null;
}

function firstReminderUtcStartingFromDay(params: {
  startDayKey: string;
  hour: number;
  minute: number;
  timezone: string;
}): Date {
  let dk = params.startDayKey;
  for (let i = 0; i < 366; i += 1) {
    const instant = utcInstantAtOrAfterLocalWallClockOnDay({
      localDayKey: dk,
      hour: params.hour,
      minute: params.minute,
      timezone: params.timezone,
    });
    if (instant) return instant;
    dk = nextCalendarDayKey(dk);
  }
  throw new Error('reminderNextUtc: could not resolve reminder instant in zone');
}

export interface ScheduleNextReminderParams {
  now: Date;
  timezone: string | null | undefined;
  reminderTimeLocal: string | null | undefined;
  dailyRemindersEnabled: boolean;
  lastDailyReminderSentDayKey: string | null | undefined;
  allowMultipleRemindersPerDay: boolean;
}

/**
 * Computes persisted `next_reminder_at_utc`: always a deliberate schedule, never an implicit "send now".
 * When `allowMultipleRemindersPerDay` is true and we already sent today, uses **interval** gap only (not HH:mm).
 */
export function computeStoredNextReminderUtc(params: ScheduleNextReminderParams): Date | null {
  const {
    now,
    timezone: tzIn,
    reminderTimeLocal: rtIn,
    dailyRemindersEnabled: enabled,
    lastDailyReminderSentDayKey,
    allowMultipleRemindersPerDay,
  } = params;

  if (!enabled) return null;

  const timezone = normalizeTimezone(tzIn);
  const reminderTimeLocal = normalizeReminderTimeLocal(rtIn);
  const { hour, minute } = parseReminderTimeLocal(reminderTimeLocal);
  const todayKey = getDayKeyForDate(now, timezone);

  if (allowMultipleRemindersPerDay && lastDailyReminderSentDayKey === todayKey) {
    const gap = Math.max(60_000, defaultReminderRepeatGapMs());
    return new Date(now.getTime() + gap);
  }

  if (!allowMultipleRemindersPerDay && lastDailyReminderSentDayKey === todayKey) {
    const nk = nextCalendarDayKey(todayKey);
    return firstReminderUtcStartingFromDay({
      startDayKey: nk,
      hour,
      minute,
      timezone,
    });
  }

  const todaySlot = utcInstantAtOrAfterLocalWallClockOnDay({
    localDayKey: todayKey,
    hour,
    minute,
    timezone,
  });

  if (todaySlot && todaySlot.getTime() > now.getTime()) {
    return todaySlot;
  }

  const nk = nextCalendarDayKey(todayKey);
  return firstReminderUtcStartingFromDay({
    startDayKey: nk,
    hour,
    minute,
    timezone,
  });
}

export interface AfterSuccessfulSendParams {
  sentAt: Date;
  timezone: string | null | undefined;
  reminderTimeLocal: string | null | undefined;
  allowMultipleRemindersPerDay: boolean;
  repeatGapMs: number;
}

/**
 * After a successful push: multiple-per-day mode uses **only** `sentAt + gap` (interval). Otherwise next local
 * calendar day at configured HH:mm — never mixing interval and wall-clock in the same branch.
 */
export function computeNextReminderUtcAfterSuccessfulSend(
  params: AfterSuccessfulSendParams
): Date {
  const {
    sentAt,
    timezone: tzIn,
    reminderTimeLocal: rtIn,
    allowMultipleRemindersPerDay,
    repeatGapMs,
  } = params;
  const timezone = normalizeTimezone(tzIn);
  const reminderTimeLocal = normalizeReminderTimeLocal(rtIn);
  const { hour, minute } = parseReminderTimeLocal(reminderTimeLocal);

  if (allowMultipleRemindersPerDay) {
    const t = sentAt.getTime() + Math.max(60_000, repeatGapMs);
    return new Date(t);
  }

  const todayKey = getDayKeyForDate(sentAt, timezone);
  let dk = nextCalendarDayKey(todayKey);
  return firstReminderUtcStartingFromDay({
    startDayKey: dk,
    hour,
    minute,
    timezone,
  });
}

export function defaultReminderRepeatGapMs(): number {
  const raw = Number(process.env.REMINDER_REPEAT_GAP_MS ?? 600_000);
  return Number.isFinite(raw) && raw >= 60_000 ? raw : 600_000;
}

export function defaultReminderClaimStaleAfterMs(): number {
  const raw = Number(process.env.REMINDER_CLAIM_STALE_AFTER_MS ?? 600_000);
  return Number.isFinite(raw) && raw >= 60_000 ? raw : 600_000;
}
