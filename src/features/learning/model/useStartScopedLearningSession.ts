import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';
import type { ScopedSessionMode } from '../domain/learning.types';

export function useStartScopedLearningSession() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: ({
      rootNoteId,
      mode,
    }: {
      rootNoteId: string;
      mode: ScopedSessionMode;
    }) => learningApi.startScopedSession(rootNoteId, mode, timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}
