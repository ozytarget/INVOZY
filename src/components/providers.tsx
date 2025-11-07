'use client';

import { DocumentProvider } from '@/hooks/use-documents';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from './ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <DocumentProvider>
        {children}
      </DocumentProvider>
      <Toaster />
    </FirebaseClientProvider>
  );
}
