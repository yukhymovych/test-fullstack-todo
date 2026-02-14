import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getToken,
  setToken,
  clearToken,
  isTokenExpired,
  getTokenMsLeft,
} from '../../shared/lib/auth';
import { setLogoutCallback } from '../../shared/api/http';

interface AuthContextValue {
  token: string | null;
  isAuthed: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    setLogoutCallback(logout);
    return () => {
      setLogoutCallback(null);
    };
  }, [logout]);

  useEffect(() => {
    const checkAndScheduleLogout = () => {
      const t = getToken();
      if (!t || isTokenExpired(t)) {
        clearToken();
        setTokenState(null);
        navigate('/login');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }
      setTokenState(t);
      const msLeft = getTokenMsLeft(t);
      if (msLeft > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          clearToken();
          setTokenState(null);
          navigate('/login');
        }, msLeft);
      }
    };

    checkAndScheduleLogout();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) {
        checkAndScheduleLogout();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [navigate, token]);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
  }, []);

  const value: AuthContextValue = {
    token,
    isAuthed: !!token && !isTokenExpired(token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
