import { createContext, useContext } from 'react';

export interface AuthContextValue {
  isAuthed: boolean;
  isLoading: boolean;
  isApiReady: boolean;
  user: { sub?: string; email?: string; name?: string; picture?: string } | null;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
