'use client';

import { DocumentView } from "@/components/document-view";
import { useDocuments } from "@/hooks/use-documents";
import { notFound } from "next/navigation";

export default function PublicEstimateViewPage({ params }: { params: { id: string } }) {
  const { documents } = useDocuments();
  const document = documents.find(doc => doc.id === params.id && doc.type === 'Estimate');

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
