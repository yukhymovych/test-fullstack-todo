import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';

export function useTodayReviewLogs() {
  const timezone = getBrowserTimezone();
  return useQuery({
    queryKey: LEARNING_KEYS.todayReviewLogs(timezone),
    queryFn: () => learningApi.getTodayReviewLogs(timezone),
  });
}
