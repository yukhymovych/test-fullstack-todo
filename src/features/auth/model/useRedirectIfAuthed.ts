import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/contexts/AuthContext';

const NOTES_ROUTE = '/notes';

/**
 * Redirects to /notes when user is already authenticated.
 * Call in login/register pages to avoid showing auth form to logged-in users.
 */
export function useRedirectIfAuthed(): void {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) {
      navigate(NOTES_ROUTE, { replace: true });
    }
  }, [isAuthed, navigate]);
}
