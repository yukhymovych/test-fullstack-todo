import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as learningApi from '../api/learningApi';
import {
  LEARNING_KEYS,
  getBrowserTimezone,
} from './learning.queries';

export function useStartLearningSession() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: () => learningApi.startSession(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}

export function useResetSessionDebug() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: () => learningApi.resetSessionDebug(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}

export function useDeleteFutureSessionsDebug() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: () => learningApi.deleteFutureSessionsDebug(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}

export function useDeleteTodayScopedSessionsDebug() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: () => learningApi.deleteTodayScopedSessionsDebug(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}

export function useRefillSessionDebug() {
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();

  return useMutation({
    mutationFn: () => learningApi.refillSessionDebug(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
    },
  });
}
