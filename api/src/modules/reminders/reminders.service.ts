import * as learningService from '../learning/learning.service.js';
import * as authSQL from '../auth/auth.sql.js';
import * as remindersSQL from './reminders.sql.js';
import { sendDailyReminderPush, sendDebugReminderPush } from './webPush.service.js';
import { normalizePushLocale } from './pushNotificationI18n.js';
import {
  normalizeReminderTimeLocal,
  normalizeTimezone,
  shouldAttemptReminderNow,
} from './reminderSchedule.js';

const ALLOW_MULTIPLE_REMINDERS_PER_DAY =
  process.env.REMINDER_ALLOW_MULTIPLE_PER_DAY?.toLowerCase() === 'true';

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
}

export async function deactivatePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  return remindersSQL.deactivatePushSubscriptionByEndpoint(userId, endpoint);
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

export interface DailyReminderJobStats {
  usersChecked: number;
  usersSkippedBeforeTime: number;
  usersSkippedAlreadySentToday: number;
  usersSkippedNoSubscriptions: number;
  usersSkippedNoDue: number;
  pushesAttempted: number;
  pushesSucceeded: number;
  pushesFailed: number;
  subscriptionsDeactivated: number;
}

export async function runDailyReminderJob(): Promise<DailyReminderJobStats> {
  const users = await remindersSQL.listReminderEnabledUsers();
  const now = new Date();
  const stats: DailyReminderJobStats = {
    usersChecked: users.length,
    usersSkippedBeforeTime: 0,
    usersSkippedAlreadySentToday: 0,
    usersSkippedNoSubscriptions: 0,
    usersSkippedNoDue: 0,
    pushesAttempted: 0,
    pushesSucceeded: 0,
    pushesFailed: 0,
    subscriptionsDeactivated: 0,
  };

  for (const user of users) {
    const timingDecision = shouldAttemptReminderNow({
      now,
      timezone: user.timezone,
      reminderTimeLocal: user.daily_reminder_time_local,
      lastReminderSentDayKey: ALLOW_MULTIPLE_REMINDERS_PER_DAY
        ? null
        : user.last_daily_reminder_sent_day_key,
    });
    if (!timingDecision.shouldAttempt) {
      if (timingDecision.skipReason === 'before-time') {
        stats.usersSkippedBeforeTime += 1;
      } else if (timingDecision.skipReason === 'already-sent-today') {
        stats.usersSkippedAlreadySentToday += 1;
      }
      console.log('[reminders] user decision', {
        userId: user.id,
        decision: timingDecision.skipReason ?? 'skipped',
        timezone: user.timezone,
        reminderTimeLocal: user.daily_reminder_time_local,
        todayDayKey: timingDecision.todayDayKey,
      });
      continue;
    }

    const subscriptions = await remindersSQL.listActivePushSubscriptionsByUser(user.id);
    if (subscriptions.length === 0) {
      stats.usersSkippedNoSubscriptions += 1;
      console.log('[reminders] user decision', {
        userId: user.id,
        decision: 'no-active-subscriptions',
        timezone: user.timezone,
        reminderTimeLocal: user.daily_reminder_time_local,
        todayDayKey: timingDecision.todayDayKey,
      });
      continue;
    }

    const dueCount = await learningService.getDueStudyItemsCount(user.id);
    if (dueCount <= 0) {
      stats.usersSkippedNoDue += 1;
      console.log('[reminders] user decision', {
        userId: user.id,
        decision: 'no-due-items',
        dueCount,
        timezone: user.timezone,
        reminderTimeLocal: user.daily_reminder_time_local,
        todayDayKey: timingDecision.todayDayKey,
      });
      continue;
    }

    const locale = normalizePushLocale(user.ui_language);
    let userHadSuccessfulPush = false;
    for (const subscription of subscriptions) {
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
      await remindersSQL.markReminderSent(
        user.id,
        timingDecision.todayDayKey,
        now
      );
      console.log('[reminders] user decision', {
        userId: user.id,
        decision: 'sent',
        dueCount,
        activeSubscriptions: subscriptions.length,
        todayDayKey: timingDecision.todayDayKey,
      });
    } else {
      console.log('[reminders] user decision', {
        userId: user.id,
        decision: 'all-pushes-failed',
        dueCount,
        activeSubscriptions: subscriptions.length,
        todayDayKey: timingDecision.todayDayKey,
      });
    }
  }

  return stats;
}

export async function scheduleDebugPushForUser(
  userId: string,
  delaySeconds = 10
): Promise<{ scheduledInSeconds: number; activeSubscriptionsNow: number }> {
  const delayMs = Math.max(1, Math.floor(delaySeconds)) * 1000;
  const currentSubscriptions =
    await remindersSQL.listActivePushSubscriptionsByUser(userId);

  setTimeout(() => {
    void (async () => {
      const subscriptions = await remindersSQL.listActivePushSubscriptionsByUser(userId);
      if (subscriptions.length === 0) {
        console.log('[reminders] debug push skipped: no active subscriptions', { userId });
        return;
      }

      const locale = normalizePushLocale(
        await authSQL.getUiLanguageByUserId(userId)
      );
      const dueCount = await learningService.getDueStudyItemsCount(userId);
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
