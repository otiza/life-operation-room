'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DevThemeOverride } from './dev-theme-override';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: false,
          },
        },
      }),
  );
  return (
    <ThemeProvider>
      {process.env.NODE_ENV !== 'production' ? <DevThemeOverride /> : null}
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
