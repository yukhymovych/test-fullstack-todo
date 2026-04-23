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
  last_daily_reminder_sent_at: Date | null;
  ui_language: string;
}

export interface DueReminderUser extends ReminderCandidateUser {
  next_reminder_at_utc: Date;
}

export interface UserSchedulingRow {
  id: string;
  daily_reminders_enabled: boolean;
  daily_reminder_time_local: string;
  timezone: string;
  last_daily_reminder_sent_day_key: string | null;
  last_daily_reminder_sent_at: Date | null;
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

export async function listDueReminderCandidates(
  limit: number,
  options?: { bypassNextReminderInstant?: boolean }
): Promise<DueReminderUser[]> {
  const bypassNextReminderInstant = Boolean(options?.bypassNextReminderInstant);
  const result = await pool.query(
    `SELECT id,
            COALESCE(timezone, $1) AS timezone,
            COALESCE(daily_reminder_time_local, $2) AS daily_reminder_time_local,
            last_daily_reminder_sent_day_key,
            last_daily_reminder_sent_at,
            COALESCE(NULLIF(TRIM(ui_language), ''), 'en') AS ui_language,
            next_reminder_at_utc
     FROM users
     WHERE daily_reminders_enabled = true
       AND next_reminder_at_utc IS NOT NULL
       AND ($4::boolean OR next_reminder_at_utc <= NOW())
     ORDER BY next_reminder_at_utc ASC
     LIMIT $3`,
    [
      DEFAULT_REMINDER_TIMEZONE,
      DEFAULT_REMINDER_TIME_LOCAL,
      limit,
      bypassNextReminderInstant,
    ]
  );
  return result.rows as DueReminderUser[];
}

export async function listActivePushSubscriptionsForUserIds(
  userIds: string[]
): Promise<PushSubscriptionRecord[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query(
    `SELECT id, user_id, endpoint, p256dh, auth, expiration_time, user_agent, is_active
     FROM push_subscriptions
     WHERE user_id = ANY($1::uuid[])
       AND is_active = true`,
    [userIds]
  );
  return result.rows as PushSubscriptionRecord[];
}

export type ClaimReminderDueResult =
  | { status: 'claimed' }
  | {
      status: 'not_eligible';
      reason: 'already_sent_today' | 'race_or_state';
    };

/**
 * Atomically claims a due row. When `allowMultipleRemindersPerDay` is false, the UPDATE also requires
 * `last_daily_reminder_sent_day_key` to differ from today's local day key so we never claim a row that
 * has already recorded a send for today (duplicate-send barrier at DB level).
 */
export async function claimReminderDueInstant(
  userId: string,
  dueInstant: Date,
  params: {
    allowMultipleRemindersPerDay: boolean;
    todayDayKey: string;
  }
): Promise<ClaimReminderDueResult> {
  const r = await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = 'infinity'::timestamptz,
         reminder_claimed_at = NOW()
     WHERE id = $1
       AND daily_reminders_enabled = true
       AND reminder_claimed_at IS NULL
       AND next_reminder_at_utc IS NOT NULL
       AND next_reminder_at_utc <= NOW()
       AND next_reminder_at_utc <> 'infinity'::timestamptz
       AND next_reminder_at_utc = $2::timestamptz
       AND (
         $3::boolean = true
         OR last_daily_reminder_sent_day_key IS DISTINCT FROM $4::varchar
       )
     RETURNING id`,
    [
      userId,
      dueInstant,
      params.allowMultipleRemindersPerDay,
      params.todayDayKey,
    ]
  );
  if ((r.rowCount ?? 0) > 0) {
    return { status: 'claimed' };
  }

  if (!params.allowMultipleRemindersPerDay) {
    const row = await pool.query(
      `SELECT last_daily_reminder_sent_day_key FROM users WHERE id = $1`,
      [userId]
    );
    const ls = row.rows[0]?.last_daily_reminder_sent_day_key as string | null;
    if (ls === params.todayDayKey) {
      return { status: 'not_eligible', reason: 'already_sent_today' };
    }
  }

  return { status: 'not_eligible', reason: 'race_or_state' };
}

/** Batch-read sent markers for duplicate-send guard before push (one query per claimed batch). */
export async function getLastReminderSentDayKeysForUserIds(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;

  const result = await pool.query(
    `SELECT id::text AS id, last_daily_reminder_sent_day_key
     FROM users
     WHERE id = ANY($1::uuid[])`,
    [userIds]
  );
  for (const row of result.rows as Array<{
    id: string;
    last_daily_reminder_sent_day_key: string | null;
  }>) {
    map.set(row.id, row.last_daily_reminder_sent_day_key);
  }
  return map;
}

/**
 * Records today's local delivery **before** HTTP push so a crash after the provider accepts the message
 * still leaves DB state consistent with “already sent today” for one-per-day dedupe (`finalize` then only moves `next_reminder_at_utc`).
 * Tradeoff: crash after this UPDATE but before any HTTP call looks “sent” and skips retry until the next schedule.
 */
export async function optimisticMarkReminderSentBeforePush(params: {
  userId: string;
  todayDayKey: string;
  sentAt: Date;
  allowMultipleRemindersPerDay: boolean;
}): Promise<boolean> {
  const r = await pool.query(
    `UPDATE users
     SET last_daily_reminder_sent_day_key = $2,
         last_daily_reminder_sent_at = $3::timestamptz
     WHERE id = $1
       AND next_reminder_at_utc = 'infinity'::timestamptz
       AND daily_reminders_enabled = true
       AND (
         $4::boolean = true
         OR last_daily_reminder_sent_day_key IS DISTINCT FROM $2::varchar
       )
     RETURNING id`,
    [
      params.userId,
      params.todayDayKey,
      params.sentAt,
      params.allowMultipleRemindersPerDay,
    ]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function revertOptimisticReminderDispatch(params: {
  userId: string;
  dueInstant: Date;
  restoreDayKey: string | null;
  restoreSentAt: Date | null;
}): Promise<void> {
  await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = $2::timestamptz,
         reminder_claimed_at = NULL,
         last_daily_reminder_sent_day_key = $3,
         last_daily_reminder_sent_at = $4::timestamptz
     WHERE id = $1
       AND next_reminder_at_utc = 'infinity'::timestamptz`,
    [
      params.userId,
      params.dueInstant,
      params.restoreDayKey,
      params.restoreSentAt,
    ]
  );
}

/** When `last_daily_reminder_sent_*` already reflects delivery but `next_reminder_at_utc` is still stuck at infinity (e.g. crash before finalize). */
export async function finalizeReminderScheduleOnly(params: {
  userId: string;
  nextReminderAtUtc: Date;
}): Promise<void> {
  await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = $2::timestamptz,
         reminder_claimed_at = NULL
     WHERE id = $1
       AND next_reminder_at_utc = 'infinity'::timestamptz`,
    [params.userId, params.nextReminderAtUtc]
  );
}

/** Claims stuck on infinity past this threshold are eligible for automatic recovery (stale detection). */
export async function listStaleReminderClaimUserIds(
  staleBeforeUtc: Date
): Promise<string[]> {
  const r = await pool.query(
    `SELECT id::text AS id
     FROM users
     WHERE next_reminder_at_utc = 'infinity'::timestamptz
       AND reminder_claimed_at IS NOT NULL
       AND reminder_claimed_at < $1::timestamptz`,
    [staleBeforeUtc]
  );
  return (r.rows as Array<{ id: string }>).map((row) => row.id);
}

export async function finalizeReminderAfterSuccessfulSend(params: {
  userId: string;
  nextReminderAtUtc: Date;
  sentDayKey: string;
  sentAt: Date;
}): Promise<void> {
  await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = $2::timestamptz,
         last_daily_reminder_sent_day_key = $3,
         last_daily_reminder_sent_at = $4::timestamptz,
         reminder_claimed_at = NULL
     WHERE id = $1
       AND next_reminder_at_utc = 'infinity'::timestamptz`,
    [params.userId, params.nextReminderAtUtc, params.sentDayKey, params.sentAt]
  );
}

export async function revertReminderClaim(
  userId: string,
  dueInstant: Date
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = $2::timestamptz,
         reminder_claimed_at = NULL
     WHERE id = $1
       AND next_reminder_at_utc = 'infinity'::timestamptz`,
    [userId, dueInstant]
  );
}

export async function setNextReminderAtUtc(
  userId: string,
  nextReminderAtUtc: Date | null
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET next_reminder_at_utc = $2,
         reminder_claimed_at = NULL
     WHERE id = $1`,
    [userId, nextReminderAtUtc]
  );
}

export async function getUserSchedulingRow(
  userId: string
): Promise<UserSchedulingRow | null> {
  const result = await pool.query(
    `SELECT id,
            daily_reminders_enabled,
            COALESCE(daily_reminder_time_local, $2) AS daily_reminder_time_local,
            COALESCE(timezone, $3) AS timezone,
            last_daily_reminder_sent_day_key,
            last_daily_reminder_sent_at
     FROM users
     WHERE id = $1`,
    [userId, DEFAULT_REMINDER_TIME_LOCAL, DEFAULT_REMINDER_TIMEZONE]
  );
  return result.rows[0] ?? null;
}

export async function listUsersForReminderBackfill(): Promise<UserSchedulingRow[]> {
  const result = await pool.query(
    `SELECT id,
            daily_reminders_enabled,
            COALESCE(daily_reminder_time_local, $1) AS daily_reminder_time_local,
            COALESCE(timezone, $2) AS timezone,
            last_daily_reminder_sent_day_key,
            last_daily_reminder_sent_at
     FROM users
     WHERE daily_reminders_enabled = true`,
    [DEFAULT_REMINDER_TIME_LOCAL, DEFAULT_REMINDER_TIMEZONE]
  );
  return result.rows as UserSchedulingRow[];
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
