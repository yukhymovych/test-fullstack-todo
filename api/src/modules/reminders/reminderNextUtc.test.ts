import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStoredNextReminderUtc,
  nextCalendarDayKey,
  utcInstantAtOrAfterLocalWallClockOnDay,
} from './reminderNextUtc.js';
import { getDayKeyForDate } from './reminderSchedule.js';

test('nextCalendarDayKey advances Gregorian date', () => {
  assert.equal(nextCalendarDayKey('2024-02-28'), '2024-02-29');
  assert.equal(nextCalendarDayKey('2024-12-31'), '2025-01-01');
});

test('utcInstant finds same-day local wall clock in UTC', () => {
  const inst = utcInstantAtOrAfterLocalWallClockOnDay({
    localDayKey: '2024-06-15',
    hour: 9,
    minute: 0,
    timezone: 'UTC',
  });
  assert.ok(inst);
  assert.equal(getDayKeyForDate(inst, 'UTC'), '2024-06-15');
});

test('already sent today schedules next calendar day at local time', () => {
  const now = new Date('2024-06-15T12:00:00.000Z');
  const next = computeStoredNextReminderUtc({
    now,
    timezone: 'UTC',
    reminderTimeLocal: '09:00',
    dailyRemindersEnabled: true,
    lastDailyReminderSentDayKey: '2024-06-15',
    allowMultipleRemindersPerDay: false,
  });
  assert.ok(next);
  assert(next.getTime() > now.getTime());
  assert.equal(getDayKeyForDate(next, 'UTC'), '2024-06-16');
});

test('after configured local time passed today, next fire is tomorrow at that local time (not immediate)', () => {
  const now = new Date('2024-06-15T15:00:00.000Z');
  const next = computeStoredNextReminderUtc({
    now,
    timezone: 'UTC',
    reminderTimeLocal: '09:00',
    dailyRemindersEnabled: true,
    lastDailyReminderSentDayKey: null,
    allowMultipleRemindersPerDay: false,
  });
  assert.ok(next);
  assert(next.getTime() > now.getTime());
  assert.equal(getDayKeyForDate(next, 'UTC'), '2024-06-16');
});
