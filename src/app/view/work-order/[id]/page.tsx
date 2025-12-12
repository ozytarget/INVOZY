

'use client';

import { notFound, useParams } from "next/navigation";
import type { Document } from "@/lib/types";
import { supabase } from "@/supabase/client";
import { ClipboardList, HardHat, Wrench, Loader2, User, Home, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getWorkOrder } from "@/app/actions";
import { WorkOrderOutput } from "@/ai/flows/generate-work-order";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

function WorkOrderDisplay({ workOrder, document: documentData }: { workOrder: WorkOrderOutput, document: Document }) {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <HardHat className="w-6 h-6" />
                        Tasks to Perform
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc space-y-2 pl-5">
                        {workOrder.tasks.map((task, index) => (
                            <li key={index}>{task}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <ClipboardList className="w-6 h-6" />
                            Required Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc space-y-2 pl-5">
                            {workOrder.materials.map((material, index) => (
                                <li key={index}>{material}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <Wrench className="w-6 h-6" />
                            Necessary Tools
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc space-y-2 pl-5">
                            {workOrder.tools.map((tool, index) => (
                                <li key={index}>{tool}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function WorkOrderViewPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = typeof params.id === 'string' ? params.id : '';

  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!id) {
      notFound();
      return;
    }

    const fetchInvoice = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !data) {
          notFound();
          return;
        }

        const transformedDoc: Document = {
          id: data.id,
          userId: data.user_id,
          type: 'Invoice',
          status: data.status,
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
          lineItems: [],
          notes: data.notes || '',
          terms: data.terms || '',
          taxId: data.tax_id,
          signature: data.signature,
          isSigned: data.is_signed || false,
          payments: [],
          invoiceNumber: data.invoice_number,
          projectPhotos: data.project_photos || [],
          search_field: data.search_field || '',
        };

        setDocumentData(transformedDoc);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (documentData) {
      const generate = async () => {
        setIsGenerating(true);
        const result = await getWorkOrder({
          projectTitle: documentData.projectTitle,
          projectDescription: documentData.notes,
          lineItems: documentData.lineItems.map(item => ({ description: item.description, quantity: item.quantity })),
        });
        if (result.success && result.data) {
          setWorkOrder(result.data);
        } else {
          toast({
            variant: "destructive",
            title: "Generation Error",
            description: "Could not generate the work order. Please try again.",
          });
        }
        setIsGenerating(false);
      };
      generate();
    }
  }, [documentData, toast]);
  
  const handleSms = () => {
    if (!documentData?.clientPhone) {
        toast({
            variant: "destructive",
            title: "No Phone Number",
            description: "This client does not have a phone number on file.",
        });
        return;
    }

    const url = window.location.href;
    const message = `View your work order for: ${documentData.projectTitle}\n${url}`;
    const smsUrl = `sms:${documentData.clientPhone}?body=${encodeURIComponent(message)}`;
    
    window.open(smsUrl, '_blank');
  };

  if (isLoadingDocument) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !documentData) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen pb-32">
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="sticky top-4 z-20 mb-4 flex justify-end gap-2">
                 <Button onClick={handleSms} variant="outline" className="bg-background/80 backdrop-blur-sm">
                    <MessageSquare className="mr-2" />
                    Send SMS
                </Button>
                <Button asChild variant="outline" className="bg-background/80 backdrop-blur-sm">
                    <Link href={`/view/invoice/${id}`}>
                        <Home className="mr-2" />
                        Back to Invoice
                    </Link>
                </Button>
            </div>
             <Card className="p-8 shadow-lg">
                <CardHeader className="p-0 mb-8">
                     <header className="flex justify-between items-start mb-8">
                        <div>
                            {documentData.companyLogo && (
                                <Image src={documentData.companyLogo} alt={documentData.companyName || 'Company Logo'} width={120} height={50} className="object-contain mb-2" />
                            )}
                            <div className="text-muted-foreground">
                                <p className="font-bold text-foreground">{documentData.companyName || "Your Company"}</p>
                                <p className="whitespace-pre-line">{documentData.companyAddress || "123 Contractor Lane\nBuildsville, ST 12345"}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-bold font-headline uppercase">Work Order</h1>
                            <p className="text-muted-foreground">Reference Invoice: {documentData.invoiceNumber}</p>
                        </div>
                    </header>
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <h2 className="font-semibold text-lg mb-2">{documentData.projectTitle}</h2>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                             <div className="flex items-start gap-3">
                                <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">{documentData.clientName}</p>
                                    <p className="text-muted-foreground">{documentData.clientEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Home className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground whitespace-pre-line">{documentData.clientAddress}</p>
                                    <p className="text-muted-foreground">{documentData.clientPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <h3 className="font-semibold text-lg">Generating Work Order...</h3>
                            <p className="text-muted-foreground">The AI is analyzing the project details to create the task, material, and tool lists.</p>
                        </div>
                    )}
                    {workOrder && <WorkOrderDisplay workOrder={workOrder} document={documentData} />}
                </CardContent>
             </Card>
        </div>
    </div>
  );
}
