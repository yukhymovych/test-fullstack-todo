import { pool } from '../../db/pool.js';

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
    `SELECT id
     FROM users
     WHERE daily_reminders_enabled = true`
  );
  return result.rows;
}

export async function setDailyRemindersEnabled(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users
     SET daily_reminders_enabled = $2
     WHERE id = $1
     RETURNING daily_reminders_enabled`,
    [userId, enabled]
  );
  return Boolean(result.rows[0]?.daily_reminders_enabled);
}

export async function getDailyRemindersEnabled(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT daily_reminders_enabled
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return Boolean(result.rows[0]?.daily_reminders_enabled);
}
