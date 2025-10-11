
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Document } from "@/lib/types";

// This is a simplified simulation of fetching a public document
// In a real app, this would be a direct fetch from a database using the ID.
const findPublicDocument = (id: string, userId?: string): Document | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    // This is a workaround for the local storage simulation. We have to check all user data.
    // In a real DB, you'd just query for the document by its ID.
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_documents')) {
            const docsJson = localStorage.getItem(key);
            if (docsJson) {
                try {
                    const docs: Document[] = JSON.parse(docsJson);
                    const foundDoc = docs.find(d => d.id === id && d.type === 'Estimate');
                    if (foundDoc) {
                        return foundDoc;
                    }
                } catch (e) {
                    console.error("Failed to parse documents from localStorage", e);
                }
            }
        }
    }

    return null;
}


export default function PublicEstimateViewPage() {
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (id) {
      const foundDocument = findPublicDocument(id);
      setDocument(foundDocument);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
