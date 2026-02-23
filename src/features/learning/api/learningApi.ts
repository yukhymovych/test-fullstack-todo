import { http } from '../../../shared/api/http';
import type {
  TodaySessionResponse,
  StudyItemStatusResponse,
  Grade,
} from '../domain/learning.types';

export async function startSession(timezone?: string): Promise<TodaySessionResponse> {
  return http.post<TodaySessionResponse>('/learning/session/start', {
    timezone: timezone ?? 'UTC',
  });
}

export async function startScopedSession(
  scopePageId: string,
  timezone?: string
): Promise<TodaySessionResponse> {
  return http.post<TodaySessionResponse>('/learning/session/start-scoped', {
    scopePageId,
    timezone: timezone ?? 'UTC',
  });
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

export async function getStudyItemStatus(
  pageId: string,
  timezone?: string
): Promise<StudyItemStatusResponse> {
  const tz = timezone ?? 'UTC';
  return http.get<StudyItemStatusResponse>(
    `/learning/study-items/status?pageId=${encodeURIComponent(pageId)}&timezone=${encodeURIComponent(tz)}`
  );
}
