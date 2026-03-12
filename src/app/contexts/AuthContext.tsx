import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenProvider } from '../../shared/api/http';

interface AuthContextValue {
  isAuthed: boolean;
  isLoading: boolean;
  user: { email?: string; name?: string; picture?: string } | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      setTokenProvider(() => getAccessTokenSilently());
    } else {
      setTokenProvider(null);
    }
    return () => setTokenProvider(null);
  }, [isAuthenticated, getAccessTokenSilently]);

  const login = () => {
    loginWithRedirect();
  };

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const value: AuthContextValue = {
    isAuthed: isAuthenticated,
    isLoading,
    user: user ? { email: user.email, name: user.name, picture: user.picture } : null,
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
