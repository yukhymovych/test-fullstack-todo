import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import type { Grade } from '../domain/learning.types';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

async function logReviewHistoryForPage(pageId?: string | null): Promise<void> {
  if (!pageId) return;
  try {
    const logs = await learningApi.getStudyItemReviewLogs(pageId);
    const compactRows = logs.map((log) => ({
      reviewed_at: log.reviewed_at,
      grade: log.grade,
      source: log.source,
      elapsed_days: log.elapsed_days,
      stability_before: log.stability_before,
      stability_after: log.stability_after,
      difficulty_before: log.difficulty_before,
      difficulty_after: log.difficulty_after,
      due_before: log.due_before,
      due_after: log.due_after,
      review_day_key: log.review_day_key,
      session_id: log.session_id,
    }));

    console.groupCollapsed(
      `[learning] page ${pageId} review logs (${logs.length})`
    );
    console.table(compactRows);
    console.log('raw review logs:', logs);
    console.groupEnd();
  } catch (error) {
    console.warn('[learning] failed to load page review logs', { pageId, error });
  }
}

export function useSubmitLearningGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionItemId,
      grade,
    }: {
      sessionItemId: string;
      grade: Grade;
      noteId?: string | null;
    }) =>
      learningApi.submitGrade(sessionItemId, grade),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
      await logReviewHistoryForPage(variables.noteId);
    },
  });
}

export function useSubmitGradeByPage() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: ({ pageId, grade }: { pageId: string; grade: Grade }) =>
      learningApi.submitGradeByPage(pageId, grade, timezone),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
      await logReviewHistoryForPage(variables.pageId);
    },
  });
}
