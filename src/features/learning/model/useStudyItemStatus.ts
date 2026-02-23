import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

export function useStudyItemStatus(pageId: string | null) {
  const timezone = getBrowserTimezone();
  return useQuery({
    queryKey: LEARNING_KEYS.studyItemStatus(pageId ?? ''),
    queryFn: () => learningApi.getStudyItemStatus(pageId!, timezone),
    enabled: !!pageId,
  });
}
