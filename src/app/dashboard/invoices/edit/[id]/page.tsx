'use client';

import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";
import { useDocuments } from "@/hooks/use-documents-supabase";
import { Loader2 } from "lucide-react";
import { useParams, notFound } from "next/navigation";

export default function EditInvoicePage() {
  const params = useParams();
  const { documents, isLoading } = useDocuments();
  const id = typeof params.id === 'string' ? params.id : '';

  // Wait for documents to be loaded before trying to find the one to edit
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const documentToEdit = documents.find(doc => doc.id === id && doc.type === 'Invoice');

  // If after loading, the document is still not found, show a 404 page
  if (!documentToEdit) {
    return notFound();
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Edit Invoice #{documentToEdit.invoiceNumber}</h1>
        <p className="text-muted-foreground text-sm">Update the details for this invoice below.</p>
       </div>
      <CreateInvoiceForm documentToEdit={documentToEdit} />
    </div>
  )
}
