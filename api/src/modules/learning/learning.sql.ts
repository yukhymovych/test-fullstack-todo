import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';

const DAILY_CAP = 15;

export interface StudyItem {
  id: string;
  user_id: string;
  note_id: string;
  is_active: boolean;
  due_at: Date;
  last_reviewed_at: Date | null;
}

export interface LearningSession {
  id: string;
  user_id: string;
  day_key: string;
  status: string;
  created_at: Date;
}

export interface LearningSessionItem {
  id: string;
  session_id: string;
  note_id: string | null;
  position: number;
  state: string;
  grade: string | null;
  reviewed_at: Date | null;
  is_retry: boolean;
}

export async function getUserTimezone(userId: string): Promise<string> {
  const result = await pool.query(
    "SELECT COALESCE(timezone, 'UTC') AS tz FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.tz ?? 'UTC';
}

export async function getSessionByUserAndDay(
  userId: string,
  dayKey: string
): Promise<LearningSession | null> {
  const result = await pool.query(
    `SELECT id, user_id, day_key, status, created_at
     FROM learning_sessions
     WHERE user_id = $1 AND day_key = $2`,
    [userId, dayKey]
  );
  return result.rows[0] || null;
}

export async function createSession(
  userId: string,
  dayKey: string
): Promise<LearningSession> {
  const result = await pool.query(
    `INSERT INTO learning_sessions (user_id, day_key, status)
     VALUES ($1, $2, 'active')
     RETURNING id, user_id, day_key, status, created_at`,
    [userId, dayKey]
  );
  return result.rows[0];
}

export async function getDueStudyItems(
  userId: string,
  limit: number,
  scopeNoteIds: string[] | null
): Promise<StudyItem[]> {
  if (scopeNoteIds && scopeNoteIds.length > 0) {
    const result = await pool.query(
      `SELECT si.id, si.user_id, si.note_id, si.is_active, si.due_at, si.last_reviewed_at
       FROM study_items si
       WHERE si.user_id = $1 AND si.is_active = true AND si.due_at <= NOW()
         AND si.note_id = ANY($2::uuid[])
       ORDER BY si.due_at ASC, si.last_reviewed_at NULLS FIRST, si.note_id ASC
       LIMIT $3`,
      [userId, scopeNoteIds, limit]
    );
    return result.rows;
  }
  const result = await pool.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at
     FROM study_items
     WHERE user_id = $1 AND is_active = true AND due_at <= NOW()
     ORDER BY due_at ASC, last_reviewed_at NULLS FIRST, note_id ASC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function insertSessionItems(
  sessionId: string,
  items: { noteId: string; position: number; isRetry: boolean }[]
): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await pool.query(
      `INSERT INTO learning_session_items (session_id, note_id, position, state, is_retry)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [sessionId, item.noteId, item.position, item.isRetry]
    );
  }
}

export async function insertSessionItemAsDone(
  client: PoolClient,
  sessionId: string,
  noteId: string,
  position: number,
  grade: string,
  reviewedAt: Date
): Promise<void> {
  await client.query(
    `INSERT INTO learning_session_items (session_id, note_id, position, state, grade, reviewed_at, is_retry)
     VALUES ($1, $2, $3, 'done', $4, $5, false)`,
    [sessionId, noteId, position, grade, reviewedAt]
  );
}

export async function getSessionWithItems(
  sessionId: string,
  userId: string
): Promise<{
  session: LearningSession;
  items: (LearningSessionItem & { title?: string })[];
} | null> {
  const sessionResult = await pool.query(
    `SELECT id, user_id, day_key, status, created_at
     FROM learning_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  const session = sessionResult.rows[0];
  if (!session) return null;

  const itemsResult = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry,
            n.title
     FROM learning_session_items lsi
     LEFT JOIN notes n ON n.id = lsi.note_id AND n.user_id = $1
     WHERE lsi.session_id = $2
     ORDER BY lsi.position ASC`,
    [userId, sessionId]
  );

  const items = itemsResult.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    session_id: row.session_id as string,
    note_id: row.note_id as string | null,
    position: row.position as number,
    state: (row.note_id === null ? 'unavailable' : row.state) as string,
    grade: row.grade as string | null,
    reviewed_at: row.reviewed_at as Date | null,
    is_retry: row.is_retry as boolean,
    title: (row.title ?? '(deleted)') as string,
  }));

  return { session, items };
}

export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<LearningSession | null> {
  const result = await pool.query(
    `SELECT id, user_id, day_key, status, created_at
     FROM learning_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
}

export async function getSessionItemById(
  itemId: string,
  userId: string
): Promise<(LearningSessionItem & { session_id: string }) | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.id = $2`,
    [userId, itemId]
  );
  return result.rows[0] || null;
}

export async function getPendingSessionItemBySessionAndNote(
  sessionId: string,
  noteId: string,
  userId: string
): Promise<(LearningSessionItem & { session_id: string }) | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.session_id = $2 AND lsi.note_id = $3 AND lsi.state = 'pending'`,
    [userId, sessionId, noteId]
  );
  return result.rows[0] || null;
}

export async function getSessionItemBySessionAndNote(
  sessionId: string,
  noteId: string,
  userId: string
): Promise<{ state: string } | null> {
  const result = await pool.query(
    `SELECT lsi.state
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.session_id = $2 AND lsi.note_id = $3`,
    [userId, sessionId, noteId]
  );
  return result.rows[0] || null;
}

export async function getStudyItemByUserAndNote(
  userId: string,
  noteId: string
): Promise<StudyItem | null> {
  const result = await pool.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at
     FROM study_items
     WHERE user_id = $1 AND note_id = $2`,
    [userId, noteId]
  );
  return result.rows[0] || null;
}

export async function createStudyItem(
  userId: string,
  noteId: string
): Promise<StudyItem> {
  const result = await pool.query(
    `INSERT INTO study_items (user_id, note_id, is_active, due_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id, note_id) DO UPDATE SET is_active = true
     RETURNING id, user_id, note_id, is_active, due_at, last_reviewed_at`,
    [userId, noteId]
  );
  return result.rows[0];
}

export async function deactivateStudyItem(
  userId: string,
  noteId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE study_items SET is_active = false
     WHERE user_id = $1 AND note_id = $2
     RETURNING id`,
    [userId, noteId]
  );
  return (result.rowCount ?? 0) > 0;
}

export function getDailyCap(): number {
  return DAILY_CAP;
}

export async function getDueStudyItemsCount(
  userId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM study_items
     WHERE user_id = $1 AND is_active = true AND due_at <= NOW()`,
    [userId]
  );
  return result.rows[0]?.cnt ?? 0;
}

/** Debug: get active study items not yet in session, for refilling (ignores due_at) */
export async function getActiveStudyItemsForRefill(
  userId: string,
  sessionId: string,
  limit: number
): Promise<StudyItem[]> {
  const result = await pool.query(
    `SELECT si.id, si.user_id, si.note_id, si.is_active, si.due_at, si.last_reviewed_at
     FROM study_items si
     WHERE si.user_id = $1 AND si.is_active = true
       AND si.note_id NOT IN (
         SELECT note_id FROM learning_session_items
         WHERE session_id = $2 AND note_id IS NOT NULL
       )
     ORDER BY si.due_at ASC, si.last_reviewed_at NULLS FIRST, si.note_id ASC
     LIMIT $3`,
    [userId, sessionId, limit]
  );
  return result.rows;
}

export async function getMaxPositionInSessionPool(
  sessionId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM learning_session_items WHERE session_id = $1`,
    [sessionId]
  );
  return (result.rows[0]?.max_pos ?? -1) + 1;
}

export async function updateSessionItemGrade(
  client: PoolClient,
  itemId: string,
  grade: string,
  reviewedAt: Date
): Promise<void> {
  await client.query(
    `UPDATE learning_session_items
     SET state = 'done', grade = $1, reviewed_at = $2
     WHERE id = $3`,
    [grade, reviewedAt, itemId]
  );
}

export async function markSessionItemUnavailable(
  client: PoolClient,
  itemId: string
): Promise<void> {
  await client.query(
    `UPDATE learning_session_items SET state = 'unavailable' WHERE id = $1`,
    [itemId]
  );
}

export async function updateStudyItemAfterReview(
  client: PoolClient,
  userId: string,
  noteId: string,
  dueAt: Date
): Promise<void> {
  await client.query(
    `UPDATE study_items
     SET due_at = $1, last_reviewed_at = NOW()
     WHERE user_id = $2 AND note_id = $3`,
    [dueAt, userId, noteId]
  );
}

export async function ensureStudyItemExists(
  client: PoolClient,
  userId: string,
  noteId: string
): Promise<void> {
  await client.query(
    `INSERT INTO study_items (user_id, note_id, is_active, due_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id, note_id) DO UPDATE SET is_active = true`,
    [userId, noteId]
  );
}

export async function getMaxPositionInSession(
  client: PoolClient,
  sessionId: string
): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM learning_session_items WHERE session_id = $1`,
    [sessionId]
  );
  return (result.rows[0]?.max_pos ?? -1) + 1;
}

export async function insertRetrySessionItem(
  client: PoolClient,
  sessionId: string,
  noteId: string,
  position: number
): Promise<void> {
  await client.query(
    `INSERT INTO learning_session_items (session_id, note_id, position, state, is_retry)
     VALUES ($1, $2, $3, 'pending', true)`,
    [sessionId, noteId, position]
  );
}

export async function noteExistsForUser(
  client: PoolClient,
  noteId: string,
  userId: string
): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM notes WHERE id = $1 AND user_id = $2',
    [noteId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertReviewLog(
  client: PoolClient,
  userId: string,
  noteId: string,
  grade: string,
  source: string,
  sessionId: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO review_logs (user_id, note_id, grade, source, session_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, noteId, grade, source, sessionId]
  );
}
