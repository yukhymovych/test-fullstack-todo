import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

export function useStartScopedLearningSession() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: (rootNoteId: string) =>
      learningApi.startScopedSession(rootNoteId, timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}
