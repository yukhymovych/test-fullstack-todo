import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
