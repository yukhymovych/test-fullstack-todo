import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/app/contexts/useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import type { AppMode, CachedAccount } from '../domain/offline.types';
import { deriveAccountKey } from '../lib/accountKey';
import { getAccount, getLastActiveAccount, markAccountActive } from '../storage/accountsRepo';
import { countNotes } from '../storage/notesRepo';
import { reconcileOfflineCache } from '../sync/reconcileOfflineCache';
import { setCurrentAppMode } from '../sync/appModeRef';
import { setCurrentAccountKey } from '../sync/currentAccount';

function applyMode(next: AppMode, setMode: (m: AppMode) => void) {
  // Keep the non-React ref in lockstep with React state so that the HTTP
  // client and data facades observe the correct mode on the same tick.
  setCurrentAppMode(next);
  setMode(next);
}

interface AppModeContextValue {
  mode: AppMode;
  isReadOnly: boolean;
  account: CachedAccount | null;
  lastSyncedAt: string | null;
  refresh: () => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { isAuthed, isLoading, isApiReady, user } = useAuth();
  const isOnline = useOnlineStatus();
  const [mode, setMode] = useState<AppMode>('initializing');
  const [account, setAccount] = useState<CachedAccount | null>(null);
  const [bumpKey, setBumpKey] = useState(0);
  const reconciledForSession = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveMode() {
      if (isLoading) {
        applyMode('initializing', setMode);
        return;
      }

      if (isOnline && isAuthed && isApiReady) {
        const key = deriveAccountKey(user?.sub);
        if (!key) {
          setAccount(null);
          setCurrentAccountKey(null);
          applyMode('online_auth_required', setMode);
          return;
        }
        const existing = await getAccount(key);
        if (!cancelled) {
          setAccount(existing);
          setCurrentAccountKey(key);
          applyMode('online_authenticated', setMode);
        }
        if (existing?.offlineEnabled && !reconciledForSession.current) {
          reconciledForSession.current = true;
          void reconcileOfflineCache(key).then(async (result) => {
            if (cancelled) return;
            const fresh = await getAccount(key);
            if (cancelled) return;
            setAccount(fresh);
            // If `navigator.onLine` said online but the API is actually
            // unreachable (airplane mode turned on after Auth0 cached the
            // token, dead server, etc.), fall back to read-only cache so
            // the UI stops attempting live queries.
            if (!result.ok && result.reason === 'network_error') {
              applyMode('offline_cached_readonly', setMode);
            }
          });
        }
        return;
      }

      if (isOnline && !isAuthed) {
        const last = await getLastActiveAccount();
        if (!cancelled) {
          if (last?.offlineEnabled) {
            await markAccountActive(last.accountKey);
            setAccount(last);
            setCurrentAccountKey(last.accountKey);
            applyMode('offline_cached_readonly', setMode);
          } else {
            setAccount(null);
            setCurrentAccountKey(null);
            applyMode('online_auth_required', setMode);
          }
        }
        return;
      }

      if (!isOnline) {
        const last = await getLastActiveAccount();
        if (cancelled) return;
        if (!last) {
          setAccount(null);
          setCurrentAccountKey(null);
          applyMode('offline_no_cache', setMode);
          return;
        }
        setCurrentAccountKey(last.accountKey);
        setAccount(last);
        if (!last.offlineEnabled) {
          const cachedNoteCount = await countNotes(last.accountKey);
          if (cachedNoteCount > 0) {
            applyMode('offline_cached_readonly', setMode);
            return;
          }
          applyMode('offline_access_disabled', setMode);
          return;
        }
        applyMode('offline_cached_readonly', setMode);
      }
    }

    void resolveMode();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, isLoading, isApiReady, isOnline, user?.sub, bumpKey]);

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isReadOnly:
        mode === 'offline_cached_readonly' ||
        mode === 'offline_no_cache' ||
        mode === 'offline_access_disabled',
      account,
      lastSyncedAt: account?.lastSyncedAt ?? null,
      refresh: () => setBumpKey((k) => k + 1),
    }),
    [mode, account]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return ctx;
}
