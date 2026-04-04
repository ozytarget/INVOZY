
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { useMemo } from "react";
import { useDocuments } from "@/hooks/use-documents";
import { Loader2 } from "lucide-react";

function InvoiceViewContent() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { documents, isLoading } = useDocuments();

  const document = useMemo(() => {
    return documents.find(doc => doc.id === id && doc.type === 'Invoice') || null;
  }, [documents, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}

export default function PublicInvoiceViewPage() {
  return <InvoiceViewContent />;
}

    
