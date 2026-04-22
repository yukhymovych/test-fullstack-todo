import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { useAppMode } from '@/features/offline/model/AppModeProvider';
import { OfflineUnavailableScreen } from '@/features/offline/ui/OfflineUnavailableScreen';
import { OfflineEmptyScreen } from '@/features/offline/ui/OfflineEmptyScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthed, isLoading, isApiReady, login } = useAuth();
  const { mode } = useAppMode();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (mode === 'online_auth_required' && !isAuthed && !isLoading && isApiReady) {
      login();
    }
  }, [mode, isAuthed, isLoading, isApiReady, login]);

  if (mode === 'initializing' || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('status.loading')}</div>
      </div>
    );
  }

  if (mode === 'offline_no_cache') {
    return <OfflineUnavailableScreen />;
  }

  if (mode === 'offline_access_disabled') {
    return <OfflineEmptyScreen />;
  }

  if (mode === 'offline_cached_readonly') {
    return <>{children}</>;
  }

  if (!isAuthed || !isApiReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">
          {t('status.redirectingToLogin')}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
