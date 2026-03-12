import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/contexts/AuthContext';

export function LoginPage() {
  const { isAuthed, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) {
      navigate('/notes', { replace: true });
      return;
    }
    if (!isLoading) {
      login();
    }
  }, [isAuthed, isLoading, login, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Redirecting to login...</div>
    </div>
  );
}
