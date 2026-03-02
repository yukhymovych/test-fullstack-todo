import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS } from './learning.queries';

export function useStudyItemReviewLogs(pageId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...LEARNING_KEYS.studyItemStatus(pageId ?? ''), 'reviewLogs'],
    queryFn: () => learningApi.getStudyItemReviewLogs(pageId!),
    enabled: !!pageId && enabled,
  });
}
