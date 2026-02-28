import { pool } from '../../db/pool.js';
import * as notesSQL from '../notes/notes.sql.js';
import * as learningSQL from './learning.sql.js';
import type { Grade } from './learning.schemas.js';
import { getDayKey, isDateTodayInTimezone } from './learning.timezone.js';
import { scheduleFsrsLight } from './fsrsLight.js';
import { computeEligibleScopedNoteIds } from './learning.helpers.js';

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

  // Ensure study_items exist for all eligible pages (needed for gradeByPage when viewing note)
  for (const noteId of eligibleIds) {
    await learningSQL.createStudyItem(userId, noteId);
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

  const session = await learningSQL.getSessionById(item.session_id, userId);
  const dayKey = session?.day_key ?? null;
  const timezone = await learningSQL.getUserTimezone(userId);

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

    await learningSQL.ensureStudyItemExists(client, userId, item.note_id);
    const studyItem = await learningSQL.getStudyItemByUserAndNoteForUpdate(
      client,
      userId,
      item.note_id
    );
    if (!studyItem) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Study item not found' as const };
    }

    const now = new Date();
    const schedule = scheduleFsrsLight({
      grade,
      timezone,
      stabilityDays: studyItem.stability_days,
      difficulty: studyItem.difficulty,
      lastReviewedAt: studyItem.last_reviewed_at,
      now,
    });

    await learningSQL.updateSessionItemGrade(client, sessionItemId, grade, now);
    await learningSQL.updateStudyItemAfterReviewV2(
      client,
      userId,
      item.note_id,
      schedule.dueAt,
      schedule.nextStabilityDays,
      schedule.nextDifficulty
    );
    await learningSQL.insertReviewLogV2(client, {
      userId,
      noteId: item.note_id,
      grade,
      source: 'user',
      sessionId: item.session_id,
      elapsedDays: schedule.elapsedDays,
      stabilityBefore: studyItem.stability_days,
      difficultyBefore: studyItem.difficulty,
      stabilityAfter: schedule.nextStabilityDays,
      difficultyAfter: schedule.nextDifficulty,
      dueBefore: studyItem.due_at,
      dueAfter: schedule.dueAt,
      reviewDayKey: schedule.todayKey,
    });

    // FSRS-light rule: a page is reviewed at most once per day.
    // Even on "again", do not enqueue a same-day retry item.

    // Sync grade to same note in other today's sessions (global/scoped)
    if (dayKey) {
      const otherItemIds =
        await learningSQL.getOtherPendingSessionItemIdsForNoteToday(
          client,
          userId,
          item.session_id,
          item.note_id,
          dayKey
        );
      for (const otherId of otherItemIds) {
        await learningSQL.updateSessionItemGrade(client, otherId, grade, now);
      }
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

  // Check all today's sessions (global + scoped) for pending item
  const pendingInSession =
    await learningSQL.getPendingSessionItemForNoteInTodaySessions(
      userId,
      pageId,
      dayKey
    );
  if (pendingInSession) {
    return gradeSessionItem(userId, pendingInSession.id, grade);
  }

  // Check if already graded today in any session (global or scoped)
  const anySessionItem =
    await learningSQL.getAnySessionItemForNoteInTodaySessions(
      userId,
      pageId,
      dayKey
    );
  if (anySessionItem && anySessionItem.state !== 'pending') {
    return { success: true, alreadyGraded: true as const };
  }

  if (isDateTodayInTimezone(studyItem.last_reviewed_at, timezone)) {
    return { success: true, alreadyGraded: true as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedStudyItem = await learningSQL.getStudyItemByUserAndNoteForUpdate(
      client,
      userId,
      pageId
    );
    if (!lockedStudyItem || !lockedStudyItem.is_active) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Page not in learning' as const };
    }

    const now = new Date();
    const schedule = scheduleFsrsLight({
      grade,
      timezone,
      stabilityDays: lockedStudyItem.stability_days,
      difficulty: lockedStudyItem.difficulty,
      lastReviewedAt: lockedStudyItem.last_reviewed_at,
      now,
    });

    await learningSQL.updateStudyItemAfterReviewV2(
      client,
      userId,
      pageId,
      schedule.dueAt,
      schedule.nextStabilityDays,
      schedule.nextDifficulty
    );
    await learningSQL.insertReviewLogV2(client, {
      userId,
      noteId: pageId,
      grade,
      source: 'manual',
      sessionId: null,
      elapsedDays: schedule.elapsedDays,
      stabilityBefore: lockedStudyItem.stability_days,
      difficultyBefore: lockedStudyItem.difficulty,
      stabilityAfter: schedule.nextStabilityDays,
      difficultyAfter: schedule.nextDifficulty,
      dueBefore: lockedStudyItem.due_at,
      dueAfter: schedule.dueAt,
      reviewDayKey: schedule.todayKey,
    });

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

export async function getDescendantsWithLearningCount(
  userId: string,
  rootNoteId: string
): Promise<number> {
  return learningSQL.getDescendantsWithLearningCount(userId, rootNoteId);
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

/** Debug: clear all grade history and unlock all pages for grading today. */
export async function refreshAllGradesDebug(
  userId: string,
  timezone: string
) {
  const dayKey = getDayKey(timezone);
  const deletedTodaySessions =
    await learningSQL.deleteSessionsByUserAndDayAllKinds(userId, dayKey);
  const deletedReviewLogs = await learningSQL.deleteReviewLogsByUser(userId);
  const resetStudyItems =
    await learningSQL.resetStudyItemsForRefreshAllGrades(userId);

  return {
    deletedTodaySessions,
    deletedReviewLogs,
    resetStudyItems,
  };
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

export async function getStudyItemReviewLogs(userId: string, pageId: string) {
  return learningSQL.getReviewLogsByUserAndNote(userId, pageId);
}
