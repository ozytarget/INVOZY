
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const DEMO_DOCUMENTS_STORAGE_KEY = 'demoDocuments';

function InvoiceViewContent() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      notFound();
      return;
    }

    const fetchInvoice = async () => {
      try {
        if (typeof window !== 'undefined') {
          const rawDocuments = localStorage.getItem(DEMO_DOCUMENTS_STORAGE_KEY);
          const demoDocuments = rawDocuments ? (JSON.parse(rawDocuments) as Document[]) : [];
          const demoInvoice = demoDocuments.find(doc => doc.id === id && doc.type === 'Invoice');
          if (demoInvoice) {
            setDocument(demoInvoice);
            return;
          }
        }

        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

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

    
