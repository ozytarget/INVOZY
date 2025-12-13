'use client';

import { DocumentProvider } from "@/hooks/use-documents-supabase";
import { DocumentsPage } from "@/components/documents-page";

export default function InvoicesPage() {
  return (
    <DocumentProvider>
      <DocumentsPage type="Invoice" />
    </DocumentProvider>
  );
}
