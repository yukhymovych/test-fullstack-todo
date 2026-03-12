import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthed, isLoading, login } = useAuth();

  useEffect(() => {
    if (!isAuthed && !isLoading) {
      login();
    }
  }, [isAuthed, isLoading, login]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
}
