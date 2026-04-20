import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeReminderTimeLocal,
  normalizeTimezone,
  parseReminderTimeLocal,
} from './reminderSchedule.js';

test('normalizes invalid reminder time to default', () => {
  assert.equal(normalizeReminderTimeLocal('25:99'), '09:00');
});

test('normalizes invalid timezone to UTC fallback', () => {
  assert.equal(normalizeTimezone('Not/AZone'), 'UTC');
});

test('parseReminderTimeLocal splits hour and minute', () => {
  assert.deepEqual(parseReminderTimeLocal('14:30'), { hour: 14, minute: 30 });
});
