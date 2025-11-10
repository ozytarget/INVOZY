
'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Document } from "@/lib/types";
import { sendDocumentEmail } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type SendEmailDialogProps = {
  document: Document;
  companyName: string;
  onEmailSent: () => void;
  children: React.ReactNode;
}

export function SendEmailDialog({ document: documentData, companyName, onEmailSent, children }: SendEmailDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendEmail = async () => {
    setIsLoading(true);
    const documentUrl = window.location.href;
    
    const result = await sendDocumentEmail({
        to: documentData.clientEmail,
        documentUrl,
        documentType: documentData.type,
        documentNumber: documentData.type === 'Invoice' ? documentData.invoiceNumber! : documentData.estimateNumber!,
        companyName,
    });

    setIsLoading(false);

    if (result.success) {
        toast({
            title: "Email Sent",
            description: `The ${documentData.type.toLowerCase()} has been sent to ${documentData.clientEmail}.`,
        });
        onEmailSent();
    } else {
        toast({
            variant: "destructive",
            title: "Error Sending Email",
            description: result.error,
        });
    }
  }


  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send {documentData.type} to Client?</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an email to <span className="font-semibold">{documentData.clientName}</span> at <span className="font-semibold">{documentData.clientEmail}</span> with a link to view the document.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSendEmail} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
