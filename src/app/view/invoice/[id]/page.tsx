
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { doc } from "firebase/firestore";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function PublicInvoiceViewPage() {
  const params = useParams();
  const firestore = useFirestore();
  const id = typeof params.id === 'string' ? params.id : '';

  const docRef = useMemoFirebase(() => {
    if (!id) return null;
    // This now points to the root collection, making it public.
    return doc(firestore, 'invoices', id);
  }, [firestore, id]);

  const { data: document, isLoading, error } = useDoc<Document>(docRef);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If there's an error or if the document is not found after loading, show 404.
  if (error || !document) {
    notFound();
  }

  return <DocumentView document={document as Document} />;
}
