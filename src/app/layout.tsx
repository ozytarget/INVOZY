import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { DocumentProvider } from '@/hooks/use-documents';

export const metadata: Metadata = {
  title: 'invozzy',
  description: 'Create estimates and invoices with the power of AI.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#27272A" />
      </head>
      <body className="font-body antialiased">
        <DocumentProvider>
          {children}
        </DocumentProvider>
        <Toaster />
      </body>
    </html>
  );
}
