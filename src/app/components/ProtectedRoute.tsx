import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthed, isLoading, isApiReady, login } = useAuth();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isAuthed && !isLoading && isApiReady) {
      login();
    }
  }, [isAuthed, isLoading, isApiReady, login]);

  if (isLoading || (isAuthed && !isApiReady)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('status.loading')}</div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('status.redirectingToLogin')}</div>
      </div>
    );
  }

  return <>{children}</>;
}
