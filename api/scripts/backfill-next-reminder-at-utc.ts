/**
 * One-shot after deploy: fills users.next_reminder_at_utc without forcing NOW() for everyone.
 *
 * Usage: cd api && npx tsx scripts/backfill-next-reminder-at-utc.ts
 */
import 'dotenv/config';
import { pool } from '../src/db/pool.js';
import { computeStoredNextReminderUtc } from '../src/modules/reminders/reminderNextUtc.js';
import * as remindersSQL from '../src/modules/reminders/reminders.sql.js';

const allowMultiple =
  process.env.REMINDER_ALLOW_MULTIPLE_PER_DAY?.toLowerCase() === 'true';

async function main(): Promise<void> {
  const rows = await remindersSQL.listUsersForReminderBackfill();
  console.log('[backfill] users with reminders enabled:', rows.length);

  for (const row of rows) {
    const nextUtc = computeStoredNextReminderUtc({
      now: new Date(),
      timezone: row.timezone,
      reminderTimeLocal: row.daily_reminder_time_local,
      dailyRemindersEnabled: row.daily_reminders_enabled,
      lastDailyReminderSentDayKey: row.last_daily_reminder_sent_day_key,
      allowMultipleRemindersPerDay: allowMultiple,
    });

    await remindersSQL.setNextReminderAtUtc(row.id, nextUtc);
    console.log('[backfill]', row.id, '->', nextUtc?.toISOString() ?? 'null');
  }

  console.log('[backfill] done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
