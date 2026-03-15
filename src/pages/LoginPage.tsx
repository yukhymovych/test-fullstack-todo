import { useAuth } from '../app/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../shared/lib/usePageTitle';

export function LoginPage() {
  usePageTitle('Login');

  const { isAuthed, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthed) {
      navigate('/notes', { replace: true });
      return;
    }

    login();
  }, [isAuthed, isLoading, login, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading authentication...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Redirecting...</div>
    </div>
  );
}
