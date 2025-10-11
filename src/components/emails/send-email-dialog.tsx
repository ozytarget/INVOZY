
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
import { sendDocumentEmail } from "@/app/actions.tsx";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type SendEmailDialogProps = {
  document: Document;
  companyName: string;
  onEmailSent: () => void;
  children: React.ReactNode;
}

export function SendEmailDialog({ document, companyName, onEmailSent, children }: SendEmailDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendEmail = async () => {
    setIsLoading(true);
    const documentUrl = window.location.href;
    
    const result = await sendDocumentEmail({
        to: document.clientEmail,
        documentUrl,
        documentType: document.type,
        documentNumber: document.type === 'Invoice' ? document.invoiceNumber! : document.estimateNumber!,
        companyName,
    });

    setIsLoading(false);

    if (result.success) {
        toast({
            title: "Email Sent",
            description: `The ${document.type.toLowerCase()} has been sent to ${document.clientEmail}.`,
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
          <AlertDialogTitle>Send {document.type} to Client?</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an email to <span className="font-semibold">{document.clientName}</span> at <span className="font-semibold">{document.clientEmail}</span> with a link to view the document.
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
