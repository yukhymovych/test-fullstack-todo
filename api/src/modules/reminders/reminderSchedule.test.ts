import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REMINDER_TIME_LOCAL,
  DEFAULT_REMINDER_TIMEZONE,
  getDayKeyForDate,
  normalizeReminderTimeLocal,
  normalizeTimezone,
  shouldAttemptReminderNow,
} from './reminderSchedule.js';

test('normalizes invalid reminder time to default', () => {
  assert.equal(normalizeReminderTimeLocal('25:99'), DEFAULT_REMINDER_TIME_LOCAL);
  assert.equal(normalizeReminderTimeLocal(null), DEFAULT_REMINDER_TIME_LOCAL);
});

test('normalizes invalid timezone to UTC fallback', () => {
  assert.equal(normalizeTimezone('Mars/Olympus'), DEFAULT_REMINDER_TIMEZONE);
  assert.equal(normalizeTimezone(undefined), DEFAULT_REMINDER_TIMEZONE);
});

test('does not attempt before the local reminder time', () => {
  const result = shouldAttemptReminderNow({
    now: new Date('2026-04-07T08:59:00.000Z'),
    timezone: 'UTC',
    reminderTimeLocal: '09:00',
    lastReminderSentDayKey: null,
  });

  assert.equal(result.shouldAttempt, false);
  assert.equal(result.skipReason, 'before-time');
  assert.equal(result.todayDayKey, '2026-04-07');
});

test('attempts once the local reminder time is reached in the user timezone', () => {
  const result = shouldAttemptReminderNow({
    now: new Date('2026-04-07T06:00:00.000Z'),
    timezone: 'Europe/Kyiv',
    reminderTimeLocal: '09:00',
    lastReminderSentDayKey: null,
  });

  assert.equal(result.shouldAttempt, true);
  assert.equal(result.skipReason, null);
  assert.equal(result.todayDayKey, getDayKeyForDate(new Date('2026-04-07T06:00:00.000Z'), 'Europe/Kyiv'));
});

test('does not attempt twice in the same local day', () => {
  const now = new Date('2026-04-07T15:00:00.000Z');
  const todayDayKey = getDayKeyForDate(now, 'America/New_York');
  const result = shouldAttemptReminderNow({
    now,
    timezone: 'America/New_York',
    reminderTimeLocal: '09:00',
    lastReminderSentDayKey: todayDayKey,
  });

  assert.equal(result.shouldAttempt, false);
  assert.equal(result.skipReason, 'already-sent-today');
});
