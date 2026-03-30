'use client';

import { DocumentView } from '@/components/document-view';
import type { Document, Notification } from '@/lib/types';
import { supabase } from '@/supabase/client';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const DEMO_DOCUMENTS_STORAGE_KEY = 'demoDocuments';
const NOTIFICATIONS_STORAGE_KEY = 'appNotifications';

function mapDbDocToDocument(data: any, type: 'Estimate' | 'Invoice'): Document {
  let items = [];
  if (data.line_items) {
    if (Array.isArray(data.line_items)) {
      items = data.line_items;
    } else if (typeof data.line_items === 'string') {
      try {
        items = JSON.parse(data.line_items);
      } catch (error) {
        console.error('Error parsing line_items:', error);
      }
    }
  }

  return {
    id: data.id || '',
    userId: data.user_id || '',
    share_token: data.share_token,
    type,
    status: data.status || 'Draft',
    companyName: data.company_name || '',
    companyAddress: data.company_address || '',
    companyEmail: data.company_email || '',
    companyPhone: data.company_phone || '',
    companyLogo: data.company_logo,
    companyWebsite: data.company_website,
    contractorName: data.contractor_name,
    schedulingUrl: data.scheduling_url,
    clientName: data.client_name,
    clientEmail: data.client_email,
    clientAddress: data.client_address || '',
    clientPhone: data.client_phone,
    projectTitle: data.project_title,
    issuedDate: data.issued_date,
    dueDate: data.due_date,
    amount: data.amount || 0,
    taxRate: data.tax_rate || 0,
    lineItems: items,
    notes: data.notes || '',
    terms: data.terms || '',
    taxId: data.tax_id,
    signature: data.signature,
    isSigned: data.is_signed || false,
    payments: [],
    estimateNumber: data.estimate_number,
    invoiceNumber: data.invoice_number,
    projectPhotos: data.project_photos || [],
    search_field: data.search_field || '',
  };
}

function logPublicViewNotification(document: Document) {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  const notifications = raw ? (JSON.parse(raw) as Notification[]) : [];

  const now = Date.now();
  const lastForDoc = notifications.find(
    n => n.documentId === document.id && n.documentType === document.type
  );

  // Avoid notification spam when the same public page auto-refreshes.
  if (lastForDoc && now - new Date(lastForDoc.timestamp).getTime() < 30000) {
    return;
  }

  const docNumber = document.type === 'Estimate' ? document.estimateNumber : document.invoiceNumber;

  const newNotification: Notification = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `notif-${Date.now()}`,
    userId: document.userId || 'demo-user',
    message: `Public view opened: ${document.type} ${docNumber || document.id}`,
    documentId: document.id,
    documentType: document.type,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify([newNotification, ...notifications])
  );
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
        const { data: estimateData } = await (supabase
          .from('estimates') as any)
          .select('*')
          .eq('share_token', shareId)
          .single();

        if (estimateData) {
          const doc = mapDbDocToDocument(estimateData, 'Estimate');
          setDocument(doc);
          logPublicViewNotification(doc);
          return;
        }

        const { data: invoiceData } = await (supabase
          .from('invoices') as any)
          .select('*')
          .eq('share_token', shareId)
          .single();

        if (invoiceData) {
          const doc = mapDbDocToDocument(invoiceData, 'Invoice');
          setDocument(doc);
          logPublicViewNotification(doc);
          return;
        }

        if (typeof window !== 'undefined') {
          const rawDocs = localStorage.getItem(DEMO_DOCUMENTS_STORAGE_KEY);
          const demoDocs = rawDocs ? (JSON.parse(rawDocs) as Document[]) : [];
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
