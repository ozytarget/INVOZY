'use client';

import { DocumentProvider } from '@/hooks/use-documents';
import { Toaster } from './ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DocumentProvider>
      {children}
      <Toaster />
    </DocumentProvider>
  );
}
