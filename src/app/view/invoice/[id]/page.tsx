
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document, Notification } from "@/lib/types";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function PublicInvoiceViewPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const id = typeof params.id === 'string' ? params.id : '';
  const notificationSent = useRef(false);

  const docRef = useMemoFirebase(() => {
    if (!id) return null;
    return doc(firestore, 'invoices', id);
  }, [firestore, id]);

  const { data: documentData, isLoading, error } = useDoc<Document>(docRef);
  
  useEffect(() => {
    // Determine if this is an external view by checking if the `internal` flag is missing.
    // This logic relies on `isDashboardView` being derived from searchParams, which is client-side.
    const isExternalView = typeof window !== 'undefined' && !new URL(window.location.href).searchParams.has('internal');

    // Only create a notification if it's an external view and a non-owner user is viewing it.
    if (isExternalView && documentData && user && firestore && !notificationSent.current && user.uid !== documentData.userId) {
      const createNotification = async () => {
        try {
          const notificationData: Omit<Notification, 'id' | 'timestamp'> & { timestamp: any } = {
            userId: documentData.userId,
            message: `${documentData.clientName} has viewed invoice #${documentData.invoiceNumber}`,
            documentId: documentData.id,
            documentType: 'Invoice',
            isRead: false,
            timestamp: serverTimestamp(),
          };
          const notificationsCol = collection(firestore, 'users', documentData.userId, 'notifications');
          await addDoc(notificationsCol, notificationData);
          notificationSent.current = true; // Mark as sent to prevent duplicates
        } catch (error) {
          // This might fail if the viewer is not authenticated, which is fine.
          // We don't want to show an error to the client viewing the invoice.
          console.error("Could not create view notification:", error);
        }
      };
      
      createNotification();
    }
  }, [documentData, firestore, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !documentData) {
    notFound();
  }

  return <DocumentView document={documentData as Document} />;
}

    
