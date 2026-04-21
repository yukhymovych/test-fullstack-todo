import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS } from './learning.queries';
import { useAppMode } from '@/features/offline/model/AppModeProvider';

export function useDueStudyItems() {
  const { isReadOnly } = useAppMode();
  return useQuery({
    queryKey: LEARNING_KEYS.dueItems(),
    queryFn: () => learningApi.getDueStudyItems(),
    enabled: !isReadOnly,
  });
}
