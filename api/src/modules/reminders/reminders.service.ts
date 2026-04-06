import * as learningService from '../learning/learning.service.js';
import * as remindersSQL from './reminders.sql.js';
import { sendDailyReminderPush, sendDebugReminderPush } from './webPush.service.js';

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
  dailyRemindersEnabled: boolean
): Promise<{ dailyRemindersEnabled: boolean }> {
  const enabled = await remindersSQL.setDailyRemindersEnabled(
    userId,
    dailyRemindersEnabled
  );
  return { dailyRemindersEnabled: enabled };
}

export async function getReminderState(userId: string): Promise<{
  dailyRemindersEnabled: boolean;
  hasActivePushSubscription: boolean;
}> {
  const [dailyRemindersEnabled, subscriptions] = await Promise.all([
    remindersSQL.getDailyRemindersEnabled(userId),
    remindersSQL.listActivePushSubscriptionsByUser(userId),
  ]);
  return {
    dailyRemindersEnabled,
    hasActivePushSubscription: subscriptions.length > 0,
  };
}

export interface DailyReminderJobStats {
  usersChecked: number;
  usersSkippedNoSubscriptions: number;
  usersSkippedNoDue: number;
  pushesAttempted: number;
  pushesSucceeded: number;
  pushesFailed: number;
  subscriptionsDeactivated: number;
}

export async function runDailyReminderJob(): Promise<DailyReminderJobStats> {
  const users = await remindersSQL.listReminderEnabledUsers();
  const stats: DailyReminderJobStats = {
    usersChecked: users.length,
    usersSkippedNoSubscriptions: 0,
    usersSkippedNoDue: 0,
    pushesAttempted: 0,
    pushesSucceeded: 0,
    pushesFailed: 0,
    subscriptionsDeactivated: 0,
  };

  for (const user of users) {
    const subscriptions = await remindersSQL.listActivePushSubscriptionsByUser(user.id);
    if (subscriptions.length === 0) {
      stats.usersSkippedNoSubscriptions += 1;
      continue;
    }

    const dueCount = await learningService.getDueStudyItemsCount(user.id);
    if (dueCount <= 0) {
      stats.usersSkippedNoDue += 1;
      continue;
    }

    for (const subscription of subscriptions) {
      stats.pushesAttempted += 1;
      const result = await sendDailyReminderPush(subscription, dueCount);
      if (result.success) {
        stats.pushesSucceeded += 1;
      } else {
        stats.pushesFailed += 1;
        if (result.shouldDeactivate) {
          await remindersSQL.deactivatePushSubscriptionById(subscription.id);
          stats.subscriptionsDeactivated += 1;
        }
      }
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

      const dueCount = await learningService.getDueStudyItemsCount(userId);
      let pushesSucceeded = 0;
      let pushesFailed = 0;
      let subscriptionsDeactivated = 0;

      for (const subscription of subscriptions) {
        const result = await sendDebugReminderPush(subscription, dueCount);
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
