import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS } from './learning.queries';

export function useLearningSessionById(sessionId: string | undefined) {
  return useQuery({
    queryKey: LEARNING_KEYS.sessionById(sessionId ?? ''),
    queryFn: () => learningApi.getLearningSessionById(sessionId!),
    enabled: !!sessionId,
  });
}
