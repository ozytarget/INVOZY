
'use client';

import { DocumentView } from "@/components/document-view";
import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { supabase } from "@/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function EstimateViewContent() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      notFound();
      return;
    }

    const fetchEstimate = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('estimates')
          .select('*')
          .eq('id', id)
          .single() as { data: any; error: any };

        if (fetchError || !data) {
          notFound();
          return;
        }

        // ✅ Parse lineItems defensively
        let lineItems = [];
        if (data?.line_items) {
          if (Array.isArray(data.line_items)) {
            lineItems = data.line_items;
          } else if (typeof data.line_items === 'string') {
            try {
              lineItems = JSON.parse(data.line_items);
            } catch (e) {
              console.error('Error parsing line_items:', e);
              lineItems = [];
            }
          }
        }

        const transformedDoc: Document = {
          id: data.id || '',
          userId: data.user_id || '',
          type: 'Estimate',
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
          amount: data.amount,
          taxRate: data.tax_rate,
          lineItems: lineItems,
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

        setDocument(transformedDoc);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEstimate();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    notFound();
  }
  
  return <DocumentView document={document} />;
}

export default function PublicEstimateViewPage() {
  return <EstimateViewContent />;
}
