import { pool } from '../../db/pool.js';
import * as notesSQL from '../notes/notes.sql.js';
import * as learningSQL from './learning.sql.js';
import type { Grade } from './learning.schemas.js';
import { getDayKey, isDateTodayInTimezone } from './learning.timezone.js';
import { computeEligibleScopedNoteIds } from './learning.helpers.js';

const GRADE_INTERVALS_DAYS: Record<Grade, number> = {
  again: 1,
  hard: 2,
  good: 5,
  easy: 10,
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function startSession(userId: string, timezone: string) {
  const dayKey = getDayKey(timezone);
  let session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  const cap = learningSQL.getDailyCap();
  const items = await learningSQL.getDueStudyItems(userId, cap, null);

  if (!session) {
    if (items.length === 0) {
      return null;
    }
    session = await learningSQL.createSession(userId, dayKey);
    const sessionItems = items.map((item, i) => ({
      noteId: item.note_id,
      position: i,
      isRetry: false,
    }));
    await learningSQL.insertSessionItems(session.id, sessionItems);
  } else {
    const existingData = await learningSQL.getSessionWithItems(session.id, userId);
    if (existingData && existingData.items.length === 0 && items.length > 0) {
      const sessionItems = items.map((item, i) => ({
        noteId: item.note_id,
        position: i,
        isRetry: false,
      }));
      await learningSQL.insertSessionItems(session.id, sessionItems);
    }
  }

  const data = await learningSQL.getSessionWithItems(session.id, userId);
  return data;
}

export type StartScopedSessionResult =
  | { created: true; sessionId: string; total: number; session: Awaited<ReturnType<typeof learningSQL.getSessionWithItems>> }
  | { created: false; sessionId: string; total: number; session: Awaited<ReturnType<typeof learningSQL.getSessionWithItems>> }
  | { created: false; reason: 'NO_ELIGIBLE_PAGES' }
  | { created: false; reason: 'ROOT_NOT_FOUND' };

export async function startScopedSession(
  userId: string,
  rootNoteId: string,
  timezone: string
): Promise<StartScopedSessionResult> {
  const rootNote = await notesSQL.getNoteById(rootNoteId, userId);
  if (!rootNote) {
    return { created: false, reason: 'ROOT_NOT_FOUND' };
  }

  const descendantIds = await notesSQL.getDescendantIdsOrdered(rootNoteId, userId);
  if (descendantIds.length === 0) {
    return { created: false, reason: 'NO_ELIGIBLE_PAGES' };
  }

  const studyItems = await learningSQL.getStudyItemsByNoteIds(userId, descendantIds);
  const dayKey = getDayKey(timezone);
  const eligibleIds = computeEligibleScopedNoteIds({
    descendantIds,
    studyItems,
    timezone,
    dayKey,
  });
  if (eligibleIds.length === 0) {
    return { created: false, reason: 'NO_ELIGIBLE_PAGES' };
  }

  const existingSession = await learningSQL.findActiveScopedSession(
    userId,
    dayKey,
    rootNoteId
  );
  if (existingSession) {
    const data = await learningSQL.getSessionWithItems(existingSession.id, userId);
    if (!data) return { created: false, reason: 'NO_ELIGIBLE_PAGES' };
    return {
      created: false as const,
      sessionId: existingSession.id,
      total: data.items.length,
      session: data,
    };
  }

  const session = await learningSQL.createScopedSession(
    userId,
    dayKey,
    rootNoteId
  );
  const sessionItems = eligibleIds.map((noteId, i) => ({
    noteId,
    position: i,
    isRetry: false,
  }));
  await learningSQL.insertSessionItems(session.id, sessionItems);

  const data = await learningSQL.getSessionWithItems(session.id, userId);
  if (!data) return { created: false, reason: 'NO_ELIGIBLE_PAGES' };
  return {
    created: true,
    sessionId: session.id,
    total: data.items.length,
    session: data,
  };
}

export async function resolveTimezone(userId: string, override?: string): Promise<string> {
  if (override) return override;
  return learningSQL.getUserTimezone(userId);
}

export async function getTodaySession(userId: string, timezone: string) {
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return null;
  return learningSQL.getSessionWithItems(session.id, userId);
}

export async function getSessionById(
  userId: string,
  sessionId: string
) {
  const session = await learningSQL.getSessionById(sessionId, userId);
  if (!session) return null;
  return learningSQL.getSessionWithItems(sessionId, userId);
}

export async function listTodayScopedSessions(
  userId: string,
  timezone: string
) {
  const dayKey = getDayKey(timezone);
  return learningSQL.listTodayScopedSessions(userId, dayKey);
}

export async function gradeSessionItem(
  userId: string,
  sessionItemId: string,
  grade: Grade
) {
  const item = await learningSQL.getSessionItemById(sessionItemId, userId);
  if (!item) return { success: false, error: 'Session item not found' as const };
  if (item.state !== 'pending') {
    return { success: true, alreadyGraded: true as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!item.note_id) {
      await learningSQL.markSessionItemUnavailable(client, sessionItemId);
      await client.query('COMMIT');
      return { success: true };
    }

    const noteExists = await learningSQL.noteExistsForUser(
      client,
      item.note_id,
      userId
    );
    if (!noteExists) {
      await learningSQL.markSessionItemUnavailable(client, sessionItemId);
      await client.query('COMMIT');
      return { success: true };
    }

    const now = new Date();
    const intervalDays = GRADE_INTERVALS_DAYS[grade];
    const dueAt = addDays(now, intervalDays);

    await learningSQL.updateSessionItemGrade(client, sessionItemId, grade, now);
    await learningSQL.updateStudyItemAfterReview(
      client,
      userId,
      item.note_id,
      dueAt
    );
    await learningSQL.ensureStudyItemExists(client, userId, item.note_id);
    await learningSQL.insertReviewLog(
      client,
      userId,
      item.note_id,
      grade,
      'session',
      item.session_id
    );

    if (grade === 'again') {
      const maxPos = await learningSQL.getMaxPositionInSession(
        client,
        item.session_id
      );
      await learningSQL.insertRetrySessionItem(
        client,
        item.session_id,
        item.note_id,
        maxPos
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function gradeByPage(
  userId: string,
  pageId: string,
  grade: Grade,
  timezone: string
) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) return { success: false, error: 'Page not found' as const };

  const studyItem = await learningSQL.getStudyItemByUserAndNote(userId, pageId);
  if (!studyItem || !studyItem.is_active) {
    return { success: false, error: 'Page not in learning' as const };
  }

  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  const existingSessionItem = session
    ? await learningSQL.getSessionItemBySessionAndNote(
        session.id,
        pageId,
        userId
      )
    : null;

  if (existingSessionItem) {
    if (existingSessionItem.state === 'pending') {
      const pendingItem = await learningSQL.getPendingSessionItemBySessionAndNote(
        session!.id,
        pageId,
        userId
      );
      if (pendingItem) return gradeSessionItem(userId, pendingItem.id, grade);
    }
    return { success: true, alreadyGraded: true as const };
  }

  if (isDateTodayInTimezone(studyItem.last_reviewed_at, timezone)) {
    return { success: true, alreadyGraded: true as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date();
    const intervalDays = GRADE_INTERVALS_DAYS[grade];
    const baseDate =
      studyItem.due_at > now ? studyItem.due_at : now;
    const dueAt = addDays(baseDate, intervalDays);

    await learningSQL.updateStudyItemAfterReview(
      client,
      userId,
      pageId,
      dueAt
    );
    await learningSQL.insertReviewLog(
      client,
      userId,
      pageId,
      grade,
      'manual',
      null
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function activateStudyItem(userId: string, pageId: string) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) return null;
  return learningSQL.createStudyItem(userId, pageId);
}

export async function activateStudyItemScoped(
  userId: string,
  scopePageId: string
) {
  const note = await notesSQL.getNoteById(scopePageId, userId);
  if (!note) return null;
  const descendantIds = await notesSQL.getDescendantIds(scopePageId, userId);
  const noteIds = [scopePageId, ...descendantIds];
  for (const id of noteIds) {
    await learningSQL.createStudyItem(userId, id);
  }
  return { activated: noteIds.length };
}

export async function deactivateStudyItem(userId: string, pageId: string) {
  const ok = await learningSQL.deactivateStudyItem(userId, pageId);
  return ok ? { ok: true } : null;
}

export async function getDueStudyItemsCount(userId: string): Promise<number> {
  return learningSQL.getDueStudyItemsCount(userId);
}

/** Debug: delete today's session and reset study items due_at for a fresh session */
export async function resetSessionDebug(userId: string, timezone: string) {
  const dayKey = getDayKey(timezone);
  const deleted = await learningSQL.deleteSessionByUserAndDay(userId, dayKey);
  const reset = await learningSQL.resetStudyItemsDueAt(userId);
  return { deleted: deleted > 0, resetCount: reset };
}

/** Debug: delete future sessions (day_key > today). Returns deleted count. */
export async function deleteFutureSessionsDebug(
  userId: string,
  timezone: string
) {
  const todayKey = getDayKey(timezone);
  const deleted = await learningSQL.deleteFutureSessions(userId, todayKey);
  return { deleted };
}

/** Debug: delete today's scoped sessions. Returns deleted count. */
export async function deleteTodayScopedSessionsDebug(
  userId: string,
  timezone: string
) {
  const dayKey = getDayKey(timezone);
  const deleted = await learningSQL.deleteTodayScopedSessions(userId, dayKey);
  return { deleted };
}

/** Debug: add up to 15 more items to today's session from active study_items */
export async function refillSessionDebug(
  userId: string,
  timezone: string
) {
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return null;

  const cap = learningSQL.getDailyCap();
  const items = await learningSQL.getActiveStudyItemsForRefill(
    userId,
    session.id,
    cap
  );
  if (items.length === 0) return learningSQL.getSessionWithItems(session.id, userId);

  const maxPos = await learningSQL.getMaxPositionInSessionPool(session.id);
  const sessionItems = items.map((item, i) => ({
    noteId: item.note_id,
    position: maxPos + i,
    isRetry: false,
  }));
  await learningSQL.insertSessionItems(session.id, sessionItems);

  return learningSQL.getSessionWithItems(session.id, userId);
}

export async function getStudyItemStatus(
  userId: string,
  pageId: string,
  timezone?: string
) {
  const item = await learningSQL.getStudyItemByUserAndNote(userId, pageId);
  if (!item) return { status: 'inactive' as const };
  const status = item.is_active ? ('active' as const) : ('inactive' as const);
  const gradedToday =
    !!timezone && isDateTodayInTimezone(item.last_reviewed_at, timezone);
  const base = {
    status,
    dueAt: item.due_at,
    lastReviewedAt: item.last_reviewed_at,
    gradedToday: gradedToday || undefined,
  };

  if (!timezone) return base;
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return base;
  const sessionItem = await learningSQL.getSessionItemBySessionAndNote(
    session.id,
    pageId,
    userId
  );
  if (!sessionItem) return base;
  return {
    ...base,
    inTodaySession: true as const,
    sessionItemState: sessionItem.state as 'pending' | 'done' | 'skipped' | 'unavailable',
  };
}
