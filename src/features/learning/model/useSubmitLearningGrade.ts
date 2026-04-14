import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRef, type MutableRefObject } from 'react';
import i18n from '@/shared/i18n/i18n';
import * as learningApi from '../api/learningApi';
import type { Grade, GradeSubmitResponse } from '../domain/learning.types';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';
import { showToast } from '../../../shared/lib/toast';

const UNDO_DURATION_MS = 10_000;

function getDaysDiff(
  reviewedAt: string | null,
  dueAfter: string | null
): number | null {
  if (!reviewedAt || !dueAfter) return null;
  const beforeMs = new Date(reviewedAt).getTime();
  const afterMs = new Date(dueAfter).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Number(((afterMs - beforeMs) / oneDayMs).toFixed(2));
}

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
      daysDiff: getDaysDiff(log.reviewed_at, log.due_after),
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

function showUndoGradeToast(params: {
  response: GradeSubmitResponse;
  queryClient: QueryClient;
  undoInFlightRef: MutableRefObject<boolean>;
  pageId?: string | null;
}): void {
  const { response, queryClient, undoInFlightRef, pageId } = params;
  if (
    response.alreadyGraded ||
    !response.reviewLogId ||
    !response.undoToken ||
    !response.undoExpiresAt
  ) {
    return;
  }

  const reviewLogId = response.reviewLogId;
  const undoToken = response.undoToken;
  showToast({
    message: i18n.t('toasts.gradeSavedUndo', { ns: 'learning' }),
    durationMs: UNDO_DURATION_MS,
    action: {
      label: i18n.t('toasts.undo', { ns: 'learning' }),
      showCountdown: true,
      onClick: async () => {
        if (undoInFlightRef.current) return;
        undoInFlightRef.current = true;
        try {
          await learningApi.undoReviewGrade({
            reviewLogId,
            undoToken,
          });
          queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
          showToast(i18n.t('toasts.gradeUndone', { ns: 'learning' }));
          await logReviewHistoryForPage(pageId);
        } catch {
          showToast(i18n.t('toasts.undoFailed', { ns: 'learning' }));
        } finally {
          undoInFlightRef.current = false;
        }
      },
    },
  });
}

export function useSubmitLearningGrade() {
  const queryClient = useQueryClient();
  const undoInFlightRef = useRef(false);

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
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
      if (response.retrievabilityAtReview != null) {
        console.log(
          `[learning] retrievability at review: ${(response.retrievabilityAtReview * 100).toFixed(1)}%`
        );
      }
      await logReviewHistoryForPage(variables.noteId);

      showUndoGradeToast({
        response,
        queryClient,
        undoInFlightRef,
        pageId: variables.noteId,
      });
    },
  });
}

export function useSubmitGradeByPage() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();
  const undoInFlightRef = useRef(false);

  return useMutation({
    mutationFn: ({ pageId, grade }: { pageId: string; grade: Grade }) =>
      learningApi.submitGradeByPage(pageId, grade, timezone),
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
      if (response.retrievabilityAtReview != null) {
        console.log(
          `[learning] retrievability at review: ${(response.retrievabilityAtReview * 100).toFixed(1)}%`
        );
      }
      await logReviewHistoryForPage(variables.pageId);

      showUndoGradeToast({
        response,
        queryClient,
        undoInFlightRef,
        pageId: variables.pageId,
      });
    },
  });
}
