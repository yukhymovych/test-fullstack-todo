import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/useAuth';
import { deriveAccountKey } from '../lib/accountKey';
import { clearAll, clearCurrentAccount } from '../sync/clearOfflineCache';
import { useAppMode } from './AppModeProvider';

export function useClearCurrentAccountCache() {
  const { user } = useAuth();
  const { refresh } = useAppMode();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const accountKey = deriveAccountKey(user?.sub);
      if (!accountKey) return;
      await clearCurrentAccount(accountKey);
    },
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries();
    },
  });
}

export function useClearAllOfflineCache() {
  const { refresh } = useAppMode();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => clearAll(),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries();
    },
  });
}
