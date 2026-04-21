import * as learningApi from './learningApi';
import type { StudyItemStatusResponse } from '../domain/learning.types';
import { isOfflineMode } from '@/features/offline/sync/appModeRef';
import { getCurrentAccountKey } from '@/features/offline/sync/currentAccount';
import { getStudyByNote } from '@/features/offline/storage/studyRepo';

export async function getStudyItemStatus(
  pageId: string,
  timezone?: string
): Promise<StudyItemStatusResponse> {
  if (isOfflineMode()) {
    const accountKey = getCurrentAccountKey();
    if (!accountKey) return { status: 'inactive' };
    const row = await getStudyByNote(accountKey, pageId);
    if (!row) return { status: 'inactive' };
    return {
      status: row.status,
      dueAt: row.dueAt,
      lastReviewedAt: row.lastReviewedAt,
      stabilityDays: row.stabilityDays,
      difficulty: row.difficulty,
      gradedToday: false,
      inTodaySession: false,
    };
  }
  return learningApi.getStudyItemStatus(pageId, timezone);
}
