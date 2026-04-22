import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from '../../shared/ui/Toaster';
import { TooltipProvider } from '../../shared/ui';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from '../../shared/config/env';
import { AppModeProvider } from '@/features/offline/model/AppModeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Default is `online`, which skips running `queryFn` while offline. Our
      // read facades use Dexie when offline and must still execute.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        useRefreshTokens={true}
        useRefreshTokensFallback={true}
        cacheLocation="localstorage"
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: AUTH0_AUDIENCE,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MantineProvider>
            <TooltipProvider>
              <AuthProvider>
                <AppModeProvider>
                  {children}
                  <Toaster />
                </AppModeProvider>
              </AuthProvider>
            </TooltipProvider>
          </MantineProvider>
        </QueryClientProvider>
      </Auth0Provider>
    </BrowserRouter>
  );
}
