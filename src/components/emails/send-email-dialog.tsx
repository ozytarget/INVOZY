
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Document } from "@/lib/types";
import { sendDocumentEmail } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useDocuments } from "@/hooks/use-documents";
import { Loader2 } from "lucide-react";

// Ensure document data is synced to backend before sending email with public link
async function ensureDocumentSynced() {
  try {
    // Read current localStorage state and push to server
    const allKeys = Object.keys(localStorage);
    const docKey = allKeys.find(k => k.startsWith('demoDocuments:') && !k.includes('Backup'));
    const clientKey = allKeys.find(k => k.startsWith('demoClients:') && !k.includes('Backup'));

    if (!docKey) return;

    const documents = JSON.parse(localStorage.getItem(docKey) || '[]');
    const clients = JSON.parse(localStorage.getItem(clientKey || '') || '[]');

    // Find company settings
    const settingsKey = allKeys.find(k => k.startsWith('companySettings:'));
    const companySettings = settingsKey ? JSON.parse(localStorage.getItem(settingsKey) || '{}') : {};

    const subKey = allKeys.find(k => k.startsWith('demoSubcontractors:'));
    const subcontractors = subKey ? JSON.parse(localStorage.getItem(subKey) || '[]') : [];

    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ clients, documents, companySettings, subcontractors }),
    });
  } catch (e) {
    console.warn('[SendEmail] Pre-send sync failed:', e);
  }
}

type SendEmailDialogProps = {
  document: Document;
  companyName: string;
  onEmailSent: () => void;
  children: React.ReactNode;
}

export function SendEmailDialog({ document: documentData, companyName, onEmailSent, children }: SendEmailDialogProps) {
  const { toast } = useToast();
  const { clients } = useDocuments();
  const [isLoading, setIsLoading] = useState(false);

  const primaryEmail = documentData.clientEmail || "";
  const matchedClient = clients.find(c => c.email.toLowerCase() === primaryEmail.toLowerCase());
  const secondaryEmail = matchedClient?.secondaryEmail || "";
  const hasSecondary = Boolean(secondaryEmail && secondaryEmail.toLowerCase() !== primaryEmail.toLowerCase());
  const [selectedEmail, setSelectedEmail] = useState(primaryEmail);

  const handleSendEmail = async () => {
    setIsLoading(true);

    // Force sync to ensure document exists in DB before sending link
    await ensureDocumentSynced();

    // Build public share URL instead of current page URL
    const appUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');

    const documentUrl = `${appUrl}/public/${documentData.share_token}`;

    console.log('[send-email] Sending document email');

    const result = await sendDocumentEmail({
      to: hasSecondary ? selectedEmail : primaryEmail,
      documentUrl,
      documentType: documentData.type,
      documentNumber: documentData.type === 'Invoice' ? documentData.invoiceNumber! : documentData.estimateNumber!,
      companyName,
      companyEmail: documentData.companyEmail,
      schedulingUrl: documentData.schedulingUrl,
    });

    setIsLoading(false);

    if (result.success) {
      toast({
        title: "Email Sent",
        description: `The ${documentData.type.toLowerCase()} has been sent to ${hasSecondary ? selectedEmail : primaryEmail}.`,
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
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              <p>
                This will send an email to <span className="font-semibold">{documentData.clientName}</span> with a link to view the document.
              </p>
              {hasSecondary ? (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="email-select">Send to:</Label>
                  <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                    <SelectTrigger id="email-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={primaryEmail}>{primaryEmail} (primary)</SelectItem>
                      <SelectItem value={secondaryEmail}>{secondaryEmail} (secondary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="mt-1">Recipient: <span className="font-semibold">{primaryEmail}</span></p>
              )}
            </div>
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
