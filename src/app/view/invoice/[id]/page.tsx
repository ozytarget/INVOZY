
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

  const { data: document, isLoading, error } = useDoc<Document>(docRef);
  
  useEffect(() => {
    // Only attempt to create a notification if the document exists, a user is loaded,
    // and that user is NOT the owner of the document.
    if (document && user && firestore && !notificationSent.current && user.uid !== document.userId) {
      const createNotification = async () => {
        try {
          const notificationData: Omit<Notification, 'id' | 'timestamp'> & { timestamp: any } = {
            userId: document.userId,
            message: `${document.clientName} has viewed invoice #${document.invoiceNumber}`,
            documentId: document.id,
            documentType: 'Invoice',
            isRead: false,
            timestamp: serverTimestamp(),
          };
          const notificationsCol = collection(firestore, 'users', document.userId, 'notifications');
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
  }, [document, firestore, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    notFound();
  }

  return <DocumentView document={document as Document} />;
}
