import webpush from 'web-push';
import type { PushSubscriptionRecord } from './reminders.sql.js';

const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.WEB_PUSH_VAPID_SUBJECT;

let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) return;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error(
      'Missing WEB_PUSH_VAPID_PUBLIC_KEY/WEB_PUSH_VAPID_PRIVATE_KEY/WEB_PUSH_VAPID_SUBJECT'
    );
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  isConfigured = true;
}

export interface DailyReminderPushPayload {
  type: 'daily-review-reminder';
  title: 'Rememo';
  body: string;
  url: '/learning';
}

type PushPayload = {
  type: string;
  title: string;
  body: string;
  url: string;
};

async function sendPushPayload(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<{ success: true } | { success: false; shouldDeactivate: boolean; error: string }> {
  ensureConfigured();

  const webPushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expiration_time
      ? subscription.expiration_time.getTime()
      : null,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(webPushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    const statusCode = Number(
      (error as { statusCode?: number; statusCodeText?: string })?.statusCode
    );
    const shouldDeactivate = statusCode === 404 || statusCode === 410;
    return {
      success: false,
      shouldDeactivate,
      error:
        (error as Error)?.message ??
        `Push send failed${Number.isFinite(statusCode) ? ` (${statusCode})` : ''}`,
    };
  }
}

export async function sendDailyReminderPush(
  subscription: PushSubscriptionRecord,
  dueCount: number
): Promise<{ success: true } | { success: false; shouldDeactivate: boolean; error: string }> {
  const payload: DailyReminderPushPayload = {
    type: 'daily-review-reminder',
    title: 'Rememo',
    body: `You have ${dueCount} pages to review today`,
    url: '/learning',
  };
  return sendPushPayload(subscription, payload);
}

export async function sendDebugReminderPush(
  subscription: PushSubscriptionRecord,
  dueCount: number
): Promise<{ success: true } | { success: false; shouldDeactivate: boolean; error: string }> {
  const payload: PushPayload = {
    type: 'daily-review-reminder',
    title: 'Rememo',
    body:
      dueCount > 0
        ? `You have ${dueCount} pages to review today`
        : 'Debug reminder test: open Rememo learning',
    url: '/learning',
  };
  return sendPushPayload(subscription, payload);
}
