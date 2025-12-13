'use client';

import { CreateEstimateForm } from "@/components/estimates/create-estimate-form";
import { useDocuments } from "@/hooks/use-documents";
import { Loader2 } from "lucide-react";
import { useParams, notFound } from "next/navigation";

function EditEstimatePageContent() {
  const params = useParams();
  const { documents, isLoading } = useDocuments();
  const id = typeof params.id === 'string' ? params.id : '';

  console.log('🔍 EditEstimatePageContent - Loading data...');
  console.log('ID from URL:', id);
  console.log('isLoading:', isLoading);
  console.log('Total documents:', documents.length);

  // Wait for documents to be loaded before trying to find the one to edit
  if (isLoading) {
    console.log('⏳ Still loading documents...');
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const documentToEdit = documents.find(doc => doc.id === id && doc.type === 'Estimate');

  console.log('📄 Found documentToEdit:', {
    id: documentToEdit?.id,
    type: documentToEdit?.type,
    title: documentToEdit?.projectTitle,
    lineItemsCount: documentToEdit?.lineItems?.length,
    lineItems: documentToEdit?.lineItems,
  });

  // If after loading, the document is still not found, show a 404 page
  if (!documentToEdit) {
    console.error('❌ DOCUMENT NOT FOUND! ID:', id);
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Edit Estimate #{documentToEdit.estimateNumber}</h1>
        <p className="text-muted-foreground text-sm">Update the details for this estimate below.</p>
      </div>
      <CreateEstimateForm documentToEdit={documentToEdit} />
    </div>
  )
}

export default function EditEstimatePage() {
  return <EditEstimatePageContent />
}
