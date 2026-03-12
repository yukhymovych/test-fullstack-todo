import { useAuth } from '../app/contexts/AuthContext';
import { Button } from '../shared/ui';

export function LoginPage() {
  const { isAuthed, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading authentication...</div>
      </div>
    );
  }

  if (isAuthed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">You are already signed in.</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Button onClick={login}>Continue with Auth0</Button>
    </div>
  );
}
