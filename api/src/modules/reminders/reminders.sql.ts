import { pool } from '../../db/pool.js';
import {
  DEFAULT_REMINDER_TIME_LOCAL,
  DEFAULT_REMINDER_TIMEZONE,
} from './reminderSchedule.js';

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: Date | null;
  user_agent: string | null;
  is_active: boolean;
}

export interface ReminderCandidateUser {
  id: string;
  timezone: string;
  daily_reminder_time_local: string;
  last_daily_reminder_sent_day_key: string | null;
  ui_language: string;
}

export interface ReminderSettingsRecord {
  daily_reminders_enabled: boolean;
  daily_reminder_time_local: string;
  timezone: string;
}

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: Date | null;
  userAgent: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (
      user_id, endpoint, p256dh, auth, expiration_time, user_agent, is_active, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
    ON CONFLICT (endpoint)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      expiration_time = EXCLUDED.expiration_time,
      user_agent = EXCLUDED.user_agent,
      is_active = true,
      updated_at = NOW()`,
    [
      input.userId,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.expirationTime,
      input.userAgent,
    ]
  );
}

export async function deactivatePushSubscriptionByEndpoint(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE push_subscriptions
     SET is_active = false,
         updated_at = NOW()
     WHERE user_id = $1
       AND endpoint = $2
       AND is_active = true`,
    [userId, endpoint]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deactivatePushSubscriptionById(id: string): Promise<void> {
  await pool.query(
    `UPDATE push_subscriptions
     SET is_active = false,
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

export async function listActivePushSubscriptionsByUser(
  userId: string
): Promise<PushSubscriptionRecord[]> {
  const result = await pool.query(
    `SELECT id, user_id, endpoint, p256dh, auth, expiration_time, user_agent, is_active
     FROM push_subscriptions
     WHERE user_id = $1
       AND is_active = true`,
    [userId]
  );
  return result.rows;
}

export async function listReminderEnabledUsers(): Promise<ReminderCandidateUser[]> {
  const result = await pool.query(
    `SELECT id,
            COALESCE(timezone, $1) AS timezone,
            COALESCE(daily_reminder_time_local, $2) AS daily_reminder_time_local,
            last_daily_reminder_sent_day_key,
            COALESCE(NULLIF(TRIM(ui_language), ''), 'en') AS ui_language
     FROM users
     WHERE daily_reminders_enabled = true`
    ,
    [DEFAULT_REMINDER_TIMEZONE, DEFAULT_REMINDER_TIME_LOCAL]
  );
  return result.rows;
}

export async function updateReminderSettings(
  userId: string,
  input: {
    dailyRemindersEnabled?: boolean;
    reminderTimeLocal?: string;
    timezone?: string;
  }
): Promise<ReminderSettingsRecord> {
  const result = await pool.query(
    `UPDATE users
     SET daily_reminders_enabled = COALESCE($2, daily_reminders_enabled),
         daily_reminder_time_local = COALESCE($3, daily_reminder_time_local, $5),
         timezone = COALESCE($4, timezone, $6)
     WHERE id = $1
     RETURNING daily_reminders_enabled,
               COALESCE(daily_reminder_time_local, $5) AS daily_reminder_time_local,
               COALESCE(timezone, $6) AS timezone`,
    [
      userId,
      input.dailyRemindersEnabled ?? null,
      input.reminderTimeLocal ?? null,
      input.timezone ?? null,
      DEFAULT_REMINDER_TIME_LOCAL,
      DEFAULT_REMINDER_TIMEZONE,
    ]
  );
  return result.rows[0];
}

export async function getReminderSettings(
  userId: string
): Promise<ReminderSettingsRecord> {
  const result = await pool.query(
    `SELECT daily_reminders_enabled,
            COALESCE(daily_reminder_time_local, $2) AS daily_reminder_time_local,
            COALESCE(timezone, $3) AS timezone
     FROM users
     WHERE id = $1`,
    [userId, DEFAULT_REMINDER_TIME_LOCAL, DEFAULT_REMINDER_TIMEZONE]
  );
  return result.rows[0];
}

export async function markReminderSent(
  userId: string,
  dayKey: string,
  sentAt: Date
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET last_daily_reminder_sent_day_key = $2,
         last_daily_reminder_sent_at = $3
     WHERE id = $1`,
    [userId, dayKey, sentAt]
  );
}
