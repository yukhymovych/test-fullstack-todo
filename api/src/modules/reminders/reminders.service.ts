import * as authSQL from '../auth/auth.sql.js';
import * as learningSQL from '../learning/learning.sql.js';
import * as remindersSQL from './reminders.sql.js';
import {
  computeNextReminderUtcAfterSuccessfulSend,
  computeStoredNextReminderUtc,
  defaultReminderClaimStaleAfterMs,
  defaultReminderRepeatGapMs,
} from './reminderNextUtc.js';
import { sendDailyReminderPush, sendDebugReminderPush } from './webPush.service.js';
import { normalizePushLocale } from './pushNotificationI18n.js';
import {
  getDayKeyForDate,
  normalizeReminderTimeLocal,
  normalizeTimezone,
} from './reminderSchedule.js';

const ALLOW_MULTIPLE_REMINDERS_PER_DAY =
  process.env.REMINDER_ALLOW_MULTIPLE_PER_DAY?.toLowerCase() === 'true';

const JOB_BATCH_LIMIT = Math.min(
  500,
  Math.max(10, Number(process.env.REMINDER_JOB_BATCH_LIMIT ?? '100'))
);

/** Safety valve: draining due rows runs in bounded loops per cron invocation. */
const MAX_JOB_BATCHES_PER_RUN = Math.min(
  500,
  Math.max(1, Number(process.env.REMINDER_JOB_MAX_BATCHES_PER_RUN ?? '50'))
);

async function recomputeAndPersistNextReminder(userId: string): Promise<void> {
  const row = await remindersSQL.getUserSchedulingRow(userId);
  if (!row) return;

  const nextUtc = computeStoredNextReminderUtc({
    now: new Date(),
    timezone: row.timezone,
    reminderTimeLocal: row.daily_reminder_time_local,
    dailyRemindersEnabled: row.daily_reminders_enabled,
    lastDailyReminderSentDayKey: row.last_daily_reminder_sent_day_key,
    allowMultipleRemindersPerDay: ALLOW_MULTIPLE_REMINDERS_PER_DAY,
  });

  await remindersSQL.setNextReminderAtUtc(userId, nextUtc);
}

/**
 * Stuck row: `next_reminder_at_utc = infinity` past stale threshold.
 *
 * Deterministic rules:
 * - If **`last_daily_reminder_sent_day_key`** matches **today** (user TZ): treat delivery as already
 *   recorded — **never** reschedule another fire for this slot; only advance **`next_reminder_at_utc`**
 *   (`finalizeReminderScheduleOnly`). Matches optimistic pre-push marker / successful finalize.
 * - Else: no DB evidence of today’s send → assume dispatch never committed past claim; **recompute**
 *   next attempt (`computeStoredNextReminderUtc`), which may retry a soon due time (legitimate retry).
 *
 * Limitation: Web Push is **at-least-once**; duplicate delivery to the device without DB update cannot be
 * distinguished from zero delivery without provider ack persistence (not in scope).
 */
async function recoverStaleReminderScheduleForUser(userId: string): Promise<void> {
  const row = await remindersSQL.getUserSchedulingRow(userId);
  if (!row) return;

  if (!row.daily_reminders_enabled) {
    await remindersSQL.setNextReminderAtUtc(userId, null);
    return;
  }

  const now = new Date();
  const tz = normalizeTimezone(row.timezone);
  const todayKey = getDayKeyForDate(now, tz);
  const repeatGapMs = defaultReminderRepeatGapMs();

  const sentRecordedForToday =
    row.last_daily_reminder_sent_day_key === todayKey;

  if (sentRecordedForToday && !ALLOW_MULTIPLE_REMINDERS_PER_DAY) {
    const sentAt = row.last_daily_reminder_sent_at ?? now;
    const nextUtc = computeNextReminderUtcAfterSuccessfulSend({
      sentAt,
      timezone: row.timezone,
      reminderTimeLocal: row.daily_reminder_time_local,
      allowMultipleRemindersPerDay: false,
      repeatGapMs,
    });
    await remindersSQL.finalizeReminderScheduleOnly({
      userId,
      nextReminderAtUtc: nextUtc,
    });
    return;
  }

  if (sentRecordedForToday && ALLOW_MULTIPLE_REMINDERS_PER_DAY) {
    const nextUtc = new Date(now.getTime() + Math.max(60_000, repeatGapMs));
    await remindersSQL.finalizeReminderScheduleOnly({
      userId,
      nextReminderAtUtc: nextUtc,
    });
    return;
  }

  const nextUtc = computeStoredNextReminderUtc({
    now,
    timezone: row.timezone,
    reminderTimeLocal: row.daily_reminder_time_local,
    dailyRemindersEnabled: row.daily_reminders_enabled,
    lastDailyReminderSentDayKey: row.last_daily_reminder_sent_day_key,
    allowMultipleRemindersPerDay: ALLOW_MULTIPLE_REMINDERS_PER_DAY,
  });

  await remindersSQL.setNextReminderAtUtc(userId, nextUtc);
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: string | null | undefined;
  userAgent: string | null;
}): Promise<void> {
  await remindersSQL.upsertPushSubscription({
    userId: input.userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
    userAgent: input.userAgent,
  });
  await recomputeAndPersistNextReminder(input.userId);
}

export async function deactivatePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const updated = await remindersSQL.deactivatePushSubscriptionByEndpoint(
    userId,
    endpoint
  );
  await recomputeAndPersistNextReminder(userId);
  return updated;
}

export async function updateReminderSettings(
  userId: string,
  input: {
    dailyRemindersEnabled?: boolean;
    reminderTimeLocal?: string;
    timezone?: string;
  }
): Promise<{
  dailyRemindersEnabled: boolean;
  reminderTimeLocal: string;
  timezone: string;
}> {
  const settings = await remindersSQL.updateReminderSettings(userId, {
    dailyRemindersEnabled: input.dailyRemindersEnabled,
    reminderTimeLocal: input.reminderTimeLocal
      ? normalizeReminderTimeLocal(input.reminderTimeLocal)
      : undefined,
    timezone:
      input.timezone !== undefined ? normalizeTimezone(input.timezone) : undefined,
  });

  await recomputeAndPersistNextReminder(userId);

  return {
    dailyRemindersEnabled: Boolean(settings.daily_reminders_enabled),
    reminderTimeLocal: normalizeReminderTimeLocal(settings.daily_reminder_time_local),
    timezone: normalizeTimezone(settings.timezone),
  };
}

export async function getReminderState(userId: string): Promise<{
  dailyRemindersEnabled: boolean;
  hasActivePushSubscription: boolean;
  reminderTimeLocal: string;
  timezone: string;
}> {
  const [settings, subscriptions] = await Promise.all([
    remindersSQL.getReminderSettings(userId),
    remindersSQL.listActivePushSubscriptionsByUser(userId),
  ]);
  return {
    dailyRemindersEnabled: Boolean(settings.daily_reminders_enabled),
    hasActivePushSubscription: subscriptions.length > 0,
    reminderTimeLocal: normalizeReminderTimeLocal(settings.daily_reminder_time_local),
    timezone: normalizeTimezone(settings.timezone),
  };
}

export interface DueRemindersJobStats {
  staleClaimsRecovered: number;
  jobBatchesRun: number;
  batchLimitReached: boolean;
  candidatesReturned: number;
  eligibleForAttempt: number;
  healedAlreadySentToday: number;
  optimisticMarkFailed: number;
  skippedAlreadySentAtClaim: number;
  skippedDuplicateSendGuard: number;
  skippedNoSubscriptions: number;
  skippedNoDueItems: number;
  claimLostToConcurrentRun: number;
  pushesAttempted: number;
  pushesSucceeded: number;
  pushesFailed: number;
  subscriptionsDeactivated: number;
}

function logReminderJobRiskSignals(stats: DueRemindersJobStats): void {
  const contentionHigh = stats.claimLostToConcurrentRun > 5;
  const abnormal =
    stats.batchLimitReached ||
    stats.staleClaimsRecovered > 0 ||
    stats.optimisticMarkFailed > 0 ||
    stats.skippedDuplicateSendGuard > 0 ||
    stats.skippedAlreadySentAtClaim > 0 ||
    contentionHigh;

  if (!abnormal) return;

  console.warn(
    '[reminders][job]',
    JSON.stringify({
      level: 'warn',
      component: 'reminders.job',
      batchLimitReached: stats.batchLimitReached,
      staleClaimsRecovered: stats.staleClaimsRecovered,
      optimisticMarkFailed: stats.optimisticMarkFailed,
      skippedAlreadySentAtClaim: stats.skippedAlreadySentAtClaim,
      skippedDuplicateSendGuard: stats.skippedDuplicateSendGuard,
      claimLostToConcurrentRun: stats.claimLostToConcurrentRun,
      contentionHigh,
      jobBatchesRun: stats.jobBatchesRun,
    })
  );
}

/**
 * Cron entry: due users only, batched SQL, atomic claim, optimistic DB marker before HTTP push,
 * bounded multi-batch drain.
 *
 * Exactly-once delivery to the device is **not** guaranteed by Web Push; we reduce duplicate **scheduled**
 * sends after crashes by recording `last_daily_reminder_sent_*` before calling the push provider.
 */
export async function runDueRemindersJob(): Promise<DueRemindersJobStats> {
  const now = new Date();
  const repeatGapMs = defaultReminderRepeatGapMs();
  const stats: DueRemindersJobStats = {
    staleClaimsRecovered: 0,
    jobBatchesRun: 0,
    batchLimitReached: false,
    candidatesReturned: 0,
    eligibleForAttempt: 0,
    healedAlreadySentToday: 0,
    optimisticMarkFailed: 0,
    skippedAlreadySentAtClaim: 0,
    skippedDuplicateSendGuard: 0,
    skippedNoSubscriptions: 0,
    skippedNoDueItems: 0,
    claimLostToConcurrentRun: 0,
    pushesAttempted: 0,
    pushesSucceeded: 0,
    pushesFailed: 0,
    subscriptionsDeactivated: 0,
  };

  const staleBefore = new Date(Date.now() - defaultReminderClaimStaleAfterMs());
  const staleIds = await remindersSQL.listStaleReminderClaimUserIds(staleBefore);
  stats.staleClaimsRecovered = staleIds.length;
  for (const uid of staleIds) {
    await recoverStaleReminderScheduleForUser(uid);
  }

  while (stats.jobBatchesRun < MAX_JOB_BATCHES_PER_RUN) {
    const dueUsers = await remindersSQL.listDueReminderCandidates(JOB_BATCH_LIMIT);
    if (dueUsers.length === 0) {
      break;
    }

    stats.jobBatchesRun += 1;
    stats.candidatesReturned += dueUsers.length;

    const userIds = dueUsers.map((u) => u.id);
    const [allSubs, dueCounts] = await Promise.all([
      remindersSQL.listActivePushSubscriptionsForUserIds(userIds),
      learningSQL.getDueStudyItemsCountsByUserIds(userIds),
    ]);

    const subsByUser = new Map<string, typeof allSubs>();
    for (const s of allSubs) {
      const key = s.user_id;
      const arr = subsByUser.get(key) ?? [];
      arr.push(s);
      subsByUser.set(key, arr);
    }

    type ClaimedWork = {
      user: (typeof dueUsers)[0];
      dueInstant: Date;
      subs: NonNullable<ReturnType<typeof subsByUser.get>>;
      dueCount: number;
    };

    const claimedWork: ClaimedWork[] = [];

    for (const user of dueUsers) {
      const timezone = normalizeTimezone(user.timezone);
      const todayKey = getDayKeyForDate(now, timezone);

      if (
        !ALLOW_MULTIPLE_REMINDERS_PER_DAY &&
        user.last_daily_reminder_sent_day_key === todayKey
      ) {
        await recomputeAndPersistNextReminder(user.id);
        stats.healedAlreadySentToday += 1;
        continue;
      }

      const subs = subsByUser.get(user.id) ?? [];
      if (subs.length === 0) {
        stats.skippedNoSubscriptions += 1;
        continue;
      }

      const dueCount = dueCounts.get(user.id) ?? 0;
      if (dueCount <= 0) {
        stats.skippedNoDueItems += 1;
        continue;
      }

      stats.eligibleForAttempt += 1;

      const dueInstant = user.next_reminder_at_utc;
      const claimResult = await remindersSQL.claimReminderDueInstant(user.id, dueInstant, {
        allowMultipleRemindersPerDay: ALLOW_MULTIPLE_REMINDERS_PER_DAY,
        todayDayKey: todayKey,
      });

      if (claimResult.status !== 'claimed') {
        if (claimResult.reason === 'already_sent_today') {
          await recomputeAndPersistNextReminder(user.id);
          stats.skippedAlreadySentAtClaim += 1;
        } else {
          stats.claimLostToConcurrentRun += 1;
        }
        continue;
      }

      claimedWork.push({ user, dueInstant, subs, dueCount });
    }

    const claimedIds = claimedWork.map((w) => w.user.id);
    const lastSentMap =
      await remindersSQL.getLastReminderSentDayKeysForUserIds(claimedIds);

    for (const { user, dueInstant, subs, dueCount } of claimedWork) {
      const timezone = normalizeTimezone(user.timezone);
      const todayKey = getDayKeyForDate(now, timezone);

      if (!ALLOW_MULTIPLE_REMINDERS_PER_DAY) {
        const ls = lastSentMap.get(user.id);
        if (ls === todayKey) {
          await remindersSQL.revertReminderClaim(user.id, dueInstant);
          await recomputeAndPersistNextReminder(user.id);
          stats.skippedDuplicateSendGuard += 1;
          continue;
        }
      }

      const preDispatchDayKey = user.last_daily_reminder_sent_day_key;
      const preDispatchSentAt = user.last_daily_reminder_sent_at;

      const dispatchStartedAt = new Date();
      const marked = await remindersSQL.optimisticMarkReminderSentBeforePush({
        userId: user.id,
        todayDayKey: todayKey,
        sentAt: dispatchStartedAt,
        allowMultipleRemindersPerDay: ALLOW_MULTIPLE_REMINDERS_PER_DAY,
      });

      if (!marked) {
        await remindersSQL.revertReminderClaim(user.id, dueInstant);
        stats.optimisticMarkFailed += 1;
        continue;
      }

      const locale = normalizePushLocale(user.ui_language);
      let userHadSuccessfulPush = false;

      try {
        for (const subscription of subs) {
          stats.pushesAttempted += 1;
          const result = await sendDailyReminderPush(subscription, dueCount, locale);
          if (result.success) {
            stats.pushesSucceeded += 1;
            userHadSuccessfulPush = true;
          } else {
            stats.pushesFailed += 1;
            if (result.shouldDeactivate) {
              await remindersSQL.deactivatePushSubscriptionById(subscription.id);
              stats.subscriptionsDeactivated += 1;
            }
          }
        }

        if (userHadSuccessfulPush) {
          const sentDayKey = getDayKeyForDate(dispatchStartedAt, timezone);
          const nextUtc = computeNextReminderUtcAfterSuccessfulSend({
            sentAt: dispatchStartedAt,
            timezone,
            reminderTimeLocal: user.daily_reminder_time_local,
            allowMultipleRemindersPerDay: ALLOW_MULTIPLE_REMINDERS_PER_DAY,
            repeatGapMs,
          });
          await remindersSQL.finalizeReminderAfterSuccessfulSend({
            userId: user.id,
            nextReminderAtUtc: nextUtc,
            sentDayKey,
            sentAt: dispatchStartedAt,
          });
        } else {
          await remindersSQL.revertOptimisticReminderDispatch({
            userId: user.id,
            dueInstant,
            restoreDayKey: preDispatchDayKey,
            restoreSentAt: preDispatchSentAt,
          });
        }
      } catch (error) {
        await remindersSQL.revertOptimisticReminderDispatch({
          userId: user.id,
          dueInstant,
          restoreDayKey: preDispatchDayKey,
          restoreSentAt: preDispatchSentAt,
        });
        throw error;
      }
    }

    if (stats.jobBatchesRun >= MAX_JOB_BATCHES_PER_RUN) {
      const peek = await remindersSQL.listDueReminderCandidates(1);
      stats.batchLimitReached = peek.length > 0;
      break;
    }
  }

  logReminderJobRiskSignals(stats);
  return stats;
}

export async function scheduleDebugPushForUser(
  userId: string,
  delaySeconds = 10
): Promise<{ scheduledInSeconds: number; activeSubscriptionsNow: number }> {
  const delayMs = Math.max(1, Math.floor(delaySeconds)) * 1000;
  const currentSubscriptions =
    await remindersSQL.listActivePushSubscriptionsForUserIds([userId]);

  setTimeout(() => {
    void (async () => {
      const subscriptions =
        await remindersSQL.listActivePushSubscriptionsForUserIds([userId]);
      if (subscriptions.length === 0) {
        console.log('[reminders] debug push skipped: no active subscriptions', { userId });
        return;
      }

      const locale = normalizePushLocale(
        await authSQL.getUiLanguageByUserId(userId)
      );
      const dueCount = await learningSQL.getDueStudyItemsCount(userId);
      let pushesSucceeded = 0;
      let pushesFailed = 0;
      let subscriptionsDeactivated = 0;

      for (const subscription of subscriptions) {
        const result = await sendDebugReminderPush(subscription, dueCount, locale);
        if (result.success) {
          pushesSucceeded += 1;
        } else {
          pushesFailed += 1;
          if (result.shouldDeactivate) {
            await remindersSQL.deactivatePushSubscriptionById(subscription.id);
            subscriptionsDeactivated += 1;
          }
        }
      }

      console.log('[reminders] debug push completed', {
        userId,
        dueCount,
        pushesSucceeded,
        pushesFailed,
        subscriptionsDeactivated,
      });
    })().catch((error) => {
      console.error('[reminders] debug push failed', { userId, error });
    });
  }, delayMs);

  return {
    scheduledInSeconds: Math.floor(delayMs / 1000),
    activeSubscriptionsNow: currentSubscriptions.length,
  };
}
