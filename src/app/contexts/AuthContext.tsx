import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenProvider } from '../../shared/api/http';

interface AuthContextValue {
  isAuthed: boolean;
  isLoading: boolean;
  isApiReady: boolean;
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
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function syncTokenProvider() {
      if (isLoading) {
        setIsApiReady(false);
        return;
      }

      if (!isAuthenticated) {
        setTokenProvider(null);
        setIsApiReady(true);
        return;
      }

      const provider = () => getAccessTokenSilently();
      setTokenProvider(provider);
      setIsApiReady(false);

      try {
        await provider();
        if (isCancelled) {
          return;
        }
      } catch {
        if (isCancelled) {
          return;
        }
      }

      if (!isCancelled) {
        setIsApiReady(true);
      }
    }

    void syncTokenProvider();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  const login = () => {
    loginWithRedirect();
  };

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const value: AuthContextValue = {
    isAuthed: isAuthenticated,
    isLoading,
    isApiReady,
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
