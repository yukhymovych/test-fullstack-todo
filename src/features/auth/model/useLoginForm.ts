import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/contexts/AuthContext';
import * as authApi from '../api/authApi';
import { validateLoginForm, normalizeUsername } from '../domain/validation';
import type { UseLoginFormReturn } from './types';

const NOTES_ROUTE = '/notes';

export function useLoginForm(): UseLoginFormReturn {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleMode = useCallback(() => {
    setIsRegister((prev) => !prev);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validationError = validateLoginForm(username, password);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);
      try {
        const normalized = normalizeUsername(username);
        const { token } = isRegister
          ? await authApi.register(normalized, password)
          : await authApi.login(normalized, password);
        login(token);
        navigate(NOTES_ROUTE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [username, password, isRegister, login, navigate]
  );

  return {
    username,
    password,
    isRegister,
    error,
    isLoading,
    setUsername,
    setPassword,
    handleSubmit,
    toggleMode,
  };
}
