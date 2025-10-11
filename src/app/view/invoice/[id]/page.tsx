
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams }s from "next/navigation";
import type { Document } from "@/lib/types";
import { doc } from "firebase/firestore";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";


export default function PublicInvoiceViewPage() {
  const params = useParams();
  const { user, isUserLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const id = typeof params.id === 'string' ? params.id : '';

  const docRef = useMemoFirebase(() => {
    if (!user || !id) return null;
    return doc(firestore, 'users', user.uid, 'invoices', id);
  }, [firestore, user, id]);

  const { data: document, isLoading: isDocLoading, error } = useDoc<Document>(docRef);

  const isLoading = isUserLoading || isDocLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document && !isLoading) {
    // This will be caught by the error boundary and rendered as a 404 page.
    notFound();
  }

  return <DocumentView document={document as Document} />;
}
