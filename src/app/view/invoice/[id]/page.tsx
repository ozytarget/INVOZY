
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document, Notification } from "@/lib/types";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function PublicInvoiceViewPage() {
  const params = useParams();
  const firestore = useFirestore();
  const id = typeof params.id === 'string' ? params.id : '';
  const notificationSent = useRef(false);

  const docRef = useMemoFirebase(() => {
    if (!id) return null;
    return doc(firestore, 'invoices', id);
  }, [firestore, id]);

  const { data: document, isLoading, error } = useDoc<Document>(docRef);
  
  useEffect(() => {
    if (document && firestore && !notificationSent.current) {
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
          console.error("Error creating notification:", error);
        }
      };
      
      // We check if the viewer is likely the client, not the owner editing.
      // This is a simple check; a more robust solution might use session tracking.
      if (!window.location.pathname.startsWith('/dashboard')) {
        createNotification();
      }
    }
  }, [document, firestore]);

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
