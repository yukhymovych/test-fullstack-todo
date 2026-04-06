import {
  runDailyReminderJob,
  type DailyReminderJobStats,
} from './reminders.service.js';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAILY_HOUR_UTC = Number(process.env.DAILY_REMINDER_HOUR_UTC ?? 9);

function msUntilNextRun(now: Date): number {
  const target = new Date(now);
  target.setUTCHours(DAILY_HOUR_UTC, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return Math.max(target.getTime() - now.getTime(), MS_PER_MINUTE);
}

function logStats(stats: DailyReminderJobStats): void {
  console.log('[reminders] daily reminder job finished', stats);
}

async function runJobWithLogging(): Promise<void> {
  console.log('[reminders] daily reminder job started');
  try {
    const stats = await runDailyReminderJob();
    logStats(stats);
  } catch (error) {
    console.error('[reminders] daily reminder job failed', error);
  }
}

export function startDailyReminderScheduler(): void {
  const now = new Date();
  const initialDelay = msUntilNextRun(now);
  console.log('[reminders] scheduler initialized', {
    dailyHourUtc: DAILY_HOUR_UTC,
    firstRunInMs: initialDelay,
  });

  setTimeout(async () => {
    await runJobWithLogging();
    setInterval(() => {
      void runJobWithLogging();
    }, MS_PER_DAY);
  }, initialDelay);
}
