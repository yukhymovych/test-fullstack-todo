import { useQuery } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import { LEARNING_KEYS } from './learning.queries';

export function useDueStudyItems() {
  return useQuery({
    queryKey: LEARNING_KEYS.dueItems(),
    queryFn: () => learningApi.getDueStudyItems(),
  });
}
