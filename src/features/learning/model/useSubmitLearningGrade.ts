import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import type { Grade } from '../domain/learning.types';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

export function useSubmitLearningGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionItemId, grade }: { sessionItemId: string; grade: Grade }) =>
      learningApi.submitGrade(sessionItemId, grade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}

export function useSubmitGradeByPage() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: ({ pageId, grade }: { pageId: string; grade: Grade }) =>
      learningApi.submitGradeByPage(pageId, grade, timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}
