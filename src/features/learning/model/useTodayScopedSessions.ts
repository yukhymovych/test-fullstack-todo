import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import {
  LEARNING_KEYS,
  getBrowserTimezone,
} from './learning.queries';
import { useAppMode } from '@/features/offline/model/AppModeProvider';

export function useTodayScopedSessions() {
  const timezone = getBrowserTimezone();
  const { isReadOnly } = useAppMode();
  return useQuery({
    queryKey: LEARNING_KEYS.todayScopedSessions(timezone),
    queryFn: () => learningApi.getTodayScopedSessions(timezone),
    enabled: !isReadOnly,
  });
}
