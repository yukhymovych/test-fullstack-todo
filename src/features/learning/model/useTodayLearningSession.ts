import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import {
  LEARNING_KEYS,
  getBrowserTimezone,
} from './learning.queries';
import { useAppMode } from '@/features/offline/model/AppModeProvider';

export function useTodayLearningSession() {
  const timezone = getBrowserTimezone();
  const { isReadOnly } = useAppMode();
  return useQuery({
    queryKey: LEARNING_KEYS.todaySession(timezone),
    queryFn: () => learningApi.getTodaySession(timezone),
    enabled: !isReadOnly,
  });
}
