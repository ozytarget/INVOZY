'use client';

import { DocumentProvider } from "@/hooks/use-documents-supabase";
import { DocumentsPage } from "@/components/documents-page";

export default function EstimatesPage() {
  return (
    <DocumentProvider>
      <DocumentsPage type="Estimate" />
    </DocumentProvider>
  );
}
