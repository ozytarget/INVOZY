'use client';

import { CreateEstimateForm } from "@/components/estimates/create-estimate-form";
import { useDocuments } from "@/hooks/use-documents";
import { Loader2 } from "lucide-react";
import { useParams, notFound } from "next/navigation";

export default function EditEstimatePage() {
  const params = useParams();
  const { documents, isLoading } = useDocuments();
  const id = typeof params.id === 'string' ? params.id : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const documentToEdit = documents.find(doc => doc.id === id && doc.type === 'Estimate');

  if (!documentToEdit) {
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
