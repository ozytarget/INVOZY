'use client';

import { DocumentView } from '@/components/document-view';
import type { Document } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const DEMO_DOCUMENTS_STORAGE_KEY = 'demoDocuments';

const getAllLocalDocuments = (): Document[] => {
  if (typeof window === 'undefined') return [];

  const allDocs: Document[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === DEMO_DOCUMENTS_STORAGE_KEY || key.startsWith(`${DEMO_DOCUMENTS_STORAGE_KEY}:`)) {
      try {
        const raw = localStorage.getItem(key);
        const docs = raw ? (JSON.parse(raw) as Document[]) : [];
        docs.forEach((doc) => {
          if (!doc?.id || seen.has(doc.id)) return;
          seen.add(doc.id);
          allDocs.push(doc);
        });
      } catch {
        // Ignore malformed local storage entries.
      }
    }
  }

  return allDocs;
};

function logPublicViewNotification(document: Document) {
  // Fire-and-forget: notify the document owner server-side
  if (document.share_token) {
    fetch('/api/public/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareId: document.share_token }),
    }).catch(() => {});
  }
}

export default function PublicDocumentPage() {
  const params = useParams();
  const shareId = typeof params.shareId === 'string' ? params.shareId : '';
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shareId) {
      setIsLoading(false);
      return;
    }

    const loadDocument = async () => {
      try {
        const backendResponse = await fetch(`/api/public/document?shareId=${encodeURIComponent(shareId)}`);
        if (backendResponse.ok) {
          const payload = await backendResponse.json();
          if (payload?.document) {
            const doc = payload.document as Document;
            setDocument(doc);
            logPublicViewNotification(doc);
            return;
          }
        }

        if (typeof window !== 'undefined') {
          const demoDocs = getAllLocalDocuments();
          const demoDoc = demoDocs.find(doc => doc.share_token === shareId);

          if (demoDoc) {
            setDocument(demoDoc);
            logPublicViewNotification(demoDoc);
            return;
          }
        }

        setDocument(null);
      } catch (error) {
        console.error('Error loading public document:', error);
        setDocument(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Document not found</h1>
          <p className="text-muted-foreground mt-2">This public link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DocumentView document={document} isPublic={true} />
    </div>
  );
}
