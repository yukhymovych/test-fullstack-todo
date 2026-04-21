import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/useAuth';
import { deriveAccountKey } from '../lib/accountKey';
import { getAccount } from '../storage/accountsRepo';
import { useAppMode } from './AppModeProvider';

export const OFFLINE_ACCOUNT_QUERY_KEY = ['offline', 'account'] as const;

export function useOfflineAccount() {
  const { user } = useAuth();
  const { account: ctxAccount } = useAppMode();
  const accountKey = deriveAccountKey(user?.sub);
  return useQuery({
    queryKey: [...OFFLINE_ACCOUNT_QUERY_KEY, accountKey ?? ''],
    queryFn: () => (accountKey ? getAccount(accountKey) : null),
    enabled: !!accountKey,
    initialData: ctxAccount ?? undefined,
  });
}
