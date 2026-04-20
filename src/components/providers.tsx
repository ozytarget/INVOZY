'use client';

import { DocumentProvider } from '@/hooks/use-documents';
import { SupabaseClientProvider } from '@/supabase/provider';
import { Toaster } from './ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseClientProvider>
      <DocumentProvider>
        {children}
      </DocumentProvider>
      <Toaster />
    </SupabaseClientProvider>
  );
}
