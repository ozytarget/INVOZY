
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function InvoiceViewContent() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        // Try backend first
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          const docs: Document[] = Array.isArray(data.documents) ? data.documents : [];
          const found = docs.find(doc => doc.id === id && doc.type === 'Invoice');
          if (found) { setDocument(found); return; }
        }
        // Fall back to any scoped localStorage key
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || (!key.startsWith('demoDocuments:') && key !== 'demoDocuments')) continue;
            const raw = localStorage.getItem(key);
            const docs: Document[] = raw ? JSON.parse(raw) : [];
            const found = docs.find(doc => doc.id === id && doc.type === 'Invoice');
            if (found) { setDocument(found); return; }
          }
        }
      } catch (e) {
        console.error(e);
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

    
