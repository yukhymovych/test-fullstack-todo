import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS, getBrowserTimezone } from './learning.queries';
import { useAppMode } from '@/features/offline/model/AppModeProvider';

export function useTodayReviewLogs() {
  const timezone = getBrowserTimezone();
  const { isReadOnly } = useAppMode();
  return useQuery({
    queryKey: LEARNING_KEYS.todayReviewLogs(timezone),
    queryFn: () => learningApi.getTodayReviewLogs(timezone),
    enabled: !isReadOnly,
  });
}
