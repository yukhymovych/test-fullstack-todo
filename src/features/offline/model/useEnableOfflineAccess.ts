import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/useAuth';
import { deriveAccountKey } from '../lib/accountKey';
import { enableOfflineAccess, type EnableOfflineResult } from '../sync/enableOfflineAccess';
import { useAppMode } from './AppModeProvider';

export function useEnableOfflineAccess() {
  const { user } = useAuth();
  const { refresh } = useAppMode();
  const queryClient = useQueryClient();

  return useMutation<EnableOfflineResult, Error, void>({
    mutationFn: async () => {
      const accountKey = deriveAccountKey(user?.sub);
      if (!accountKey || !user?.sub) {
        return {
          ok: false,
          error: { code: 'not_authenticated', message: 'Sign in required.' },
        };
      }
      return enableOfflineAccess({
        accountKey,
        userSub: user.sub,
        email: user.email ?? null,
        displayName: user.name ?? null,
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        refresh();
        void queryClient.invalidateQueries();
      }
    },
  });
}
