import { useQuery } from '@tanstack/react-query';
import * as studyStatusData from '../api/studyStatusData';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

export function useStudyItemStatus(pageId: string | null) {
  const timezone = getBrowserTimezone();
  return useQuery({
    queryKey: LEARNING_KEYS.studyItemStatus(pageId ?? ''),
    queryFn: () => studyStatusData.getStudyItemStatus(pageId!, timezone),
    enabled: !!pageId,
  });
}
