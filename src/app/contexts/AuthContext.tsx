import { useEffect, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenProvider } from '../../shared/api/http';
import { AuthContext, type AuthContextValue } from './useAuth';

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
    user: user
      ? { sub: user.sub, email: user.email, name: user.name, picture: user.picture }
      : null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
