'use client';

import { DocumentView } from "@/components/document-view";
import { useDocuments } from "@/hooks/use-documents";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Document } from "@/lib/types";

export default function PublicEstimateViewPage() {
  const params = useParams();
  const { documents } = useDocuments();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    const foundDocument = documents.find(doc => doc.id === id && doc.type === 'Estimate');
    if (foundDocument) {
      setDocument(foundDocument);
    }
    setLoading(false);
  }, [id, documents]);

  if (loading) {
    // You can return a loading spinner here
    return <div>Loading...</div>;
  }

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
