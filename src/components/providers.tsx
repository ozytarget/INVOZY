'use client';

import React from 'react';
import { DocumentProvider } from '@/hooks/use-documents';
import { AuthProvider } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import { Toaster } from './ui/toaster';

function GlobalMaintenanceGuard() {
  const lastToastAtRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    const showMaintenanceToast = () => {
      const now = Date.now();
      if (now - lastToastAtRef.current < 8000) {
        return;
      }

      lastToastAtRef.current = now;
      toast({
        variant: 'destructive',
        title: 'Temporary service interruption',
        description:
          'This section is currently under maintenance. Thank you for your patience.',
      });
    };

    window.fetch = async (...args) => {
      const requestInfo = args[0];
      const url =
        typeof requestInfo === 'string'
          ? requestInfo
          : requestInfo instanceof URL
            ? requestInfo.toString()
            : requestInfo?.url ?? '';

      const isAuthRequest = url.includes('/api/auth/');

      try {
        const response = await originalFetch(...args);

        if (!isAuthRequest && !response.ok && [401, 403, 429, 500, 502, 503, 504].includes(response.status)) {
          showMaintenanceToast();
        }

        return response;
      } catch (error) {
        if (!isAuthRequest) {
          showMaintenanceToast();
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DocumentProvider>
        <GlobalMaintenanceGuard />
        {children}
        <Toaster />
      </DocumentProvider>
    </AuthProvider>
  );
}
