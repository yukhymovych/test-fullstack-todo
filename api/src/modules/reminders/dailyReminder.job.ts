import {
  runDailyReminderJob,
  type DailyReminderJobStats,
} from './reminders.service.js';

const MS_PER_MINUTE = 60_000;
const POLL_INTERVAL_MS = Math.max(
  MS_PER_MINUTE,
  Number(process.env.DAILY_REMINDER_POLL_INTERVAL_MS ?? MS_PER_MINUTE)
);

function logStats(stats: DailyReminderJobStats): void {
  console.log('[reminders] daily reminder job finished', stats);
}

let isJobRunning = false;

async function runJobWithLogging(): Promise<void> {
  if (isJobRunning) {
    console.log('[reminders] daily reminder job skipped: previous run still active');
    return;
  }

  isJobRunning = true;
  console.log('[reminders] daily reminder job started');
  try {
    const stats = await runDailyReminderJob();
    logStats(stats);
  } catch (error) {
    console.error('[reminders] daily reminder job failed', error);
  } finally {
    isJobRunning = false;
  }
}

export function startDailyReminderScheduler(): void {
  console.log('[reminders] scheduler initialized', {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  void runJobWithLogging();
  setInterval(() => {
    void runJobWithLogging();
  }, POLL_INTERVAL_MS);
}
