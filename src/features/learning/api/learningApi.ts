import { http } from '../../../shared/api/http';
import type {
  TodaySessionResponse,
  StudyItemStatusResponse,
  StudyItemReviewLog,
  Grade,
  ScopedSessionSummary,
  StartScopedSessionResponse,
} from '../domain/learning.types';

export async function startSession(timezone?: string): Promise<TodaySessionResponse | null> {
  return http.post<TodaySessionResponse | null>('/learning/session/start', {
    timezone: timezone ?? 'UTC',
  });
}

export async function startScopedSession(
  rootNoteId: string,
  timezone?: string
): Promise<StartScopedSessionResponse> {
  return http.post<StartScopedSessionResponse>('/learning/scoped/start', {
    rootNoteId,
    timezone: timezone ?? 'UTC',
  });
}

export async function getTodayScopedSessions(
  timezone?: string
): Promise<ScopedSessionSummary[]> {
  const tz = timezone ?? 'UTC';
  return http.get<ScopedSessionSummary[]>(
    `/learning/scoped/today?timezone=${encodeURIComponent(tz)}`
  );
}

export async function getLearningSessionById(
  sessionId: string
): Promise<TodaySessionResponse | null> {
  return http.get<TodaySessionResponse | null>(
    `/learning/sessions/${encodeURIComponent(sessionId)}`
  );
}

export async function resetSessionDebug(
  timezone?: string
): Promise<{ deleted: boolean; resetCount: number }> {
  const tz = timezone ?? 'UTC';
  return http.post<{ deleted: boolean; resetCount: number }>(
    `/learning/session/reset-debug?timezone=${encodeURIComponent(tz)}`
  );
}

export async function deleteFutureSessionsDebug(
  timezone?: string
): Promise<{ deleted: number }> {
  const tz = timezone ?? 'UTC';
  return http.post<{ deleted: number }>(
    `/learning/session/delete-future-debug?timezone=${encodeURIComponent(tz)}`
  );
}

export async function deleteTodayScopedSessionsDebug(
  timezone?: string
): Promise<{ deleted: number }> {
  const tz = timezone ?? 'UTC';
  return http.post<{ deleted: number }>(
    `/learning/session/delete-today-scoped-debug?timezone=${encodeURIComponent(tz)}`
  );
}

export async function refillSessionDebug(
  timezone?: string
): Promise<TodaySessionResponse | null> {
  const tz = timezone ?? 'UTC';
  return http.post<TodaySessionResponse | null>(
    `/learning/session/refill-debug?timezone=${encodeURIComponent(tz)}`
  );
}

export async function getTodaySession(
  timezone?: string
): Promise<TodaySessionResponse | null> {
  const tz = timezone ?? 'UTC';
  return http.get<TodaySessionResponse | null>(
    `/learning/session/today?timezone=${encodeURIComponent(tz)}`
  );
}

export async function submitGradeByPage(
  pageId: string,
  grade: Grade,
  timezone?: string
): Promise<{ success: boolean; alreadyGraded?: boolean }> {
  const tz = timezone ?? 'UTC';
  return http.post(`/learning/session/grade-by-page?timezone=${encodeURIComponent(tz)}`, {
    pageId,
    grade,
  });
}

export async function submitGrade(
  sessionItemId: string,
  grade: Grade
): Promise<{ success: boolean; alreadyGraded?: boolean }> {
  return http.post(`/learning/session/item/${sessionItemId}/grade`, {
    grade,
  });
}

export async function activateStudyItem(pageId: string): Promise<unknown> {
  return http.post('/learning/study-items/activate', { pageId });
}

export async function activateStudyItemScoped(
  scopePageId: string
): Promise<{ activated: number }> {
  return http.post('/learning/study-items/activate-scoped', { scopePageId });
}

export async function deactivateStudyItem(pageId: string): Promise<{ ok: boolean }> {
  return http.post('/learning/study-items/deactivate', { pageId });
}

export async function getDueStudyItemsCount(): Promise<number> {
  const res = await http.get<{ count: number }>(
    '/learning/study-items/due-count'
  );
  return res.count;
}

export async function getDescendantsWithLearningCount(
  rootNoteId: string
): Promise<{ count: number }> {
  return http.get<{ count: number }>(
    `/learning/study-items/descendants-with-learning-count?rootNoteId=${encodeURIComponent(rootNoteId)}`
  );
}

export async function getStudyItemStatus(
  pageId: string,
  timezone?: string
): Promise<StudyItemStatusResponse> {
  const tz = timezone ?? 'UTC';
  return http.get<StudyItemStatusResponse>(
    `/learning/study-items/status?pageId=${encodeURIComponent(pageId)}&timezone=${encodeURIComponent(tz)}`
  );
}

export async function getStudyItemReviewLogs(
  pageId: string
): Promise<StudyItemReviewLog[]> {
  return http.get<StudyItemReviewLog[]>(
    `/learning/study-items/review-logs?pageId=${encodeURIComponent(pageId)}`
  );
}
