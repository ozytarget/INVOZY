import { supabase } from '@/supabase/client';
import { Document as DocumentType, DocumentType as DocType } from '@/lib/types';
import { notFound } from 'next/navigation';
import { DocumentView } from '@/components/document-view';

export default async function PublicDocumentPage({ 
  params 
}: { 
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params;
  
  // Fetch document by share_token (public access, no auth needed)
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('share_token', shareId)
    .single() as { data: any; error: any };

  let document: DocumentType | null = null;

  if (data) {
    // Transform database document to Document type
    document = {
      id: data.id || '',
      userId: data.user_id || '',
      type: 'Estimate' as DocType,
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
      lineItems: (() => {
        let items = [];
        if (data.line_items) {
          if (Array.isArray(data.line_items)) {
            items = data.line_items;
          } else if (typeof data.line_items === 'string') {
            try {
              items = JSON.parse(data.line_items);
            } catch (e) {
              console.error('Error parsing line_items:', e);
              items = [];
            }
          }
        }
        return items;
      })(),
      notes: data.notes || '',
      terms: data.terms || '',
      taxId: data.tax_id,
      signature: data.signature,
      isSigned: data.is_signed || false,
      payments: [],
      estimateNumber: data.estimate_number,
      projectPhotos: data.project_photos || [],
      search_field: data.search_field || '',
    };
  } else {
    // Try invoices if not found in estimates
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('share_token', shareId)
      .single() as { data: any; error: any };

    if (invoiceData) {
      document = {
        id: invoiceData.id || '',
        userId: invoiceData.user_id || '',
        type: 'Invoice' as DocType,
        status: invoiceData.status || 'Draft',
        companyName: invoiceData.company_name || '',
        companyAddress: invoiceData.company_address || '',
        companyEmail: invoiceData.company_email || '',
        companyPhone: invoiceData.company_phone || '',
        companyLogo: invoiceData.company_logo,
        companyWebsite: invoiceData.company_website,
        contractorName: invoiceData.contractor_name,
        schedulingUrl: invoiceData.scheduling_url,
        clientName: invoiceData.client_name,
        clientEmail: invoiceData.client_email,
        clientAddress: invoiceData.client_address || '',
        clientPhone: invoiceData.client_phone,
        projectTitle: invoiceData.project_title,
        issuedDate: invoiceData.issued_date,
        dueDate: invoiceData.due_date,
        amount: invoiceData.amount || 0,
        taxRate: invoiceData.tax_rate || 0,
        lineItems: (() => {
          let items = [];
          if (invoiceData.line_items) {
            if (Array.isArray(invoiceData.line_items)) {
              items = invoiceData.line_items;
            } else if (typeof invoiceData.line_items === 'string') {
              try {
                items = JSON.parse(invoiceData.line_items);
              } catch (e) {
                console.error('Error parsing line_items:', e);
                items = [];
              }
            }
          }
          return items;
        })(),
        notes: invoiceData.notes || '',
        terms: invoiceData.terms || '',
        taxId: invoiceData.tax_id,
        signature: invoiceData.signature,
        isSigned: invoiceData.is_signed || false,
        payments: [],
        invoiceNumber: invoiceData.invoice_number,
        projectPhotos: invoiceData.project_photos || [],
        search_field: invoiceData.search_field || '',
      };
    }
  }

  if (!document) {
    notFound();
  }

  // Log view event (for notifications - we'll add this later)
  // await logDocumentView(document.id);

  return (
    <div className="min-h-screen bg-background">
      <DocumentView document={document} isPublic={true} />
    </div>
  );
}
