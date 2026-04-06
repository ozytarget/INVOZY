

'use client'

import { Document, Payment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "./ui/button";
import { useDocuments } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Share2, Edit, Trash2, DollarSign, MoreVertical, X, Mail, MessageSquare, ClipboardList, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { RecordPaymentDialog } from "./invoices/record-payment-dialog";
import { cn } from "@/lib/utils";
import { SendEmailDialog } from "./emails/send-email-dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

type DocumentViewProps = {
  document: Document;
  isPublic?: boolean;
}

const DEMO_DOCUMENTS_STORAGE_KEY = 'demoDocuments';

const getDocumentsStorageKey = (userId?: string | null) =>
  userId ? `${DEMO_DOCUMENTS_STORAGE_KEY}:${userId}` : `${DEMO_DOCUMENTS_STORAGE_KEY}:anonymous`;

const loadStoredDocuments = (userId?: string | null): Document[] => {
  if (typeof window === 'undefined') return [];
  const key = getDocumentsStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Document[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (userId) {
    const legacyRaw = localStorage.getItem(DEMO_DOCUMENTS_STORAGE_KEY);
    if (!legacyRaw) return [];
    try {
      const legacyParsed = JSON.parse(legacyRaw) as Document[];
      return Array.isArray(legacyParsed) ? legacyParsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const persistStoredDocuments = (documents: Document[], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  const key = getDocumentsStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(documents));
};

// Force sync localStorage state to backend (ensures public links work)
const forceBackendSync = async () => {
  try {
    const allKeys = Object.keys(localStorage);
    const docKey = allKeys.find(k => k.startsWith('demoDocuments:') && !k.includes('Backup'));
    const clientKey = allKeys.find(k => k.startsWith('demoClients:') && !k.includes('Backup'));
    if (!docKey) return;
    const documents = JSON.parse(localStorage.getItem(docKey) || '[]');
    const clients = JSON.parse(localStorage.getItem(clientKey || '') || '[]');
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
  } catch {}
};

const generateShareToken = (): string => {
  return crypto.randomUUID();
};

const statusStyles: Record<Document['status'], string> = {
  Paid: "border-primary text-primary",
  Sent: "border-blue-500 text-blue-500",
  Draft: "border-gray-500 text-gray-500",
  Overdue: "border-destructive text-destructive",
  Partial: "border-orange-500 text-orange-500",
  Approved: "border-green-500 text-green-500",
}

const FabMenuItem = ({ onClick, icon, label, variant = 'secondary', className = '' }: { onClick: () => void, icon: React.ReactNode, label: string, variant?: "secondary" | "destructive" | "default" | "outline", className?: string }) => (
  <div className="flex items-center justify-end gap-4">
    <span className="text-sm font-medium bg-background/80 text-foreground px-3 py-1 rounded-md shadow-lg">{label}</span>
    <Button size="icon" variant={variant} onClick={onClick} className={cn("rounded-full h-12 w-12 shadow-lg", className)}>
      {icon}
    </Button>
  </div>
);

export function DocumentView({ document: documentData, isPublic = false }: DocumentViewProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { signAndProcessDocument, deleteDocument, duplicateDocument, recordPayment, sendDocument } = useDocuments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDashboardView = searchParams.get('internal') === 'true';
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [liveSettings, setLiveSettings] = useState<{
    companyName?: string; companyAddress?: string; companyLogo?: string;
    companyEmail?: string; companyPhone?: string; companyWebsite?: string;
    contractorName?: string; schedulingUrl?: string; taxRate?: number;
  }>({
    // Pre-populate with document data so it displays immediately
    companyName: documentData.companyName,
    companyAddress: documentData.companyAddress,
    companyLogo: documentData.companyLogo,
    companyEmail: documentData.companyEmail,
    companyPhone: documentData.companyPhone,
    companyWebsite: documentData.companyWebsite,
    contractorName: documentData.contractorName,
    schedulingUrl: documentData.schedulingUrl,
    taxRate: documentData.taxRate,
  });

  // Load live company settings from DB (for internal views, or owner's settings for public views)
  // Poll every 60s to pick up company changes in real-time
  useEffect(() => {
    const load = async () => {
      try {
        let endpoint = '/api/company-settings'; // Internal view (authenticated)
        
        if (isPublic && documentData.share_token) {
          // Public view: load owner's settings
          endpoint = `/api/public/company-settings?shareId=${encodeURIComponent(documentData.share_token)}`;
        }
        
        console.log('[DocumentView] Loading company settings from:', endpoint);
        const res = await fetch(endpoint);
        console.log('[DocumentView] API Response Status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[DocumentView] Received data:', data);
          
          // Handle both { settings: {...} } and { ...settings } formats
          const settingsData = data?.settings || data?.company_settings_json || data;
          console.log('[DocumentView] Extracted settings:', settingsData);
          
          if (settingsData && Object.keys(settingsData).length > 0) {
            console.log('[DocumentView] ✓ Updating liveSettings with:', Object.keys(settingsData));
            setLiveSettings(settingsData);
          } else {
            console.log('[DocumentView] ⚠ Received empty settings object');
          }
        } else {
          console.log('[DocumentView] ✗ API returned error status:', res.status);
        }
      } catch (err) {
        console.error('[DocumentView] Exception loading settings:', err);
      }
    };
    
    load();
    const interval = setInterval(load, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [isPublic, documentData.share_token]);

  // Merge: live settings take priority for internal views; doc data (already merged server-side) for public
  const co = {
    companyName: liveSettings.companyName,
    companyAddress: liveSettings.companyAddress,
    companyLogo: liveSettings.companyLogo,
    companyEmail: liveSettings.companyEmail,
    companyPhone: liveSettings.companyPhone,
    companyWebsite: liveSettings.companyWebsite,
    contractorName: liveSettings.contractorName,
    schedulingUrl: liveSettings.schedulingUrl,
    taxRate: liveSettings.taxRate,
  };

  const downloadHandler = (photoUrl: string, filename: string) => {
    if (typeof window === "undefined") return;
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = filename || 'project-photo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ Validar lineItems es Array antes de usar reduce()
  const lineItems = Array.isArray(documentData.lineItems) ? documentData.lineItems : [];
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const taxAmount = documentData.taxRate ? subtotal * (documentData.taxRate / 100) : 0;
  const totalAmount = subtotal + taxAmount;
  const amountPaid = documentData.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  const balanceDue = totalAmount - amountPaid;

  const clearSignature = () => {
    sigCanvas.current?.clear();
  }

  const handlePublicSign = async (signature: string): Promise<string | undefined> => {
    const ownerId = documentData.userId;
    const ownerDocs = loadStoredDocuments(ownerId);
    const originalDoc = ownerDocs.find(doc => doc.id === documentData.id);

    if (!originalDoc) {
      return undefined;
    }

    if (originalDoc.type !== 'Estimate') {
      const updatedDocs = ownerDocs.map(doc =>
        doc.id === originalDoc.id
          ? { ...doc, signature, isSigned: true, status: 'Approved' as Document['status'] }
          : doc
      );
      persistStoredDocuments(updatedDocs, ownerId);
      return undefined;
    }

    const invoiceCount = ownerDocs.filter(doc => doc.type === 'Invoice').length;
    const newInvoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(3, '0')}`;
    const newInvoiceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `demo-invoice-${Date.now()}`;

    const approvedEstimate: Document = {
      ...originalDoc,
      signature,
      isSigned: true,
      status: 'Approved',
    };

    const newInvoice: Document = {
      ...originalDoc,
      id: newInvoiceId,
      userId: ownerId || originalDoc.userId,
      share_token: generateShareToken(),
      type: 'Invoice',
      status: 'Sent',
      signature,
      isSigned: true,
      issuedDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      invoiceNumber: newInvoiceNumber,
      estimateNumber: undefined,
      search_field: `${originalDoc.clientName} ${originalDoc.projectTitle} ${newInvoiceNumber}`.toLowerCase(),
    };

    const updatedDocs = [
      ...ownerDocs.map(doc => (doc.id === originalDoc.id ? approvedEstimate : doc)),
      newInvoice,
    ].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());

    persistStoredDocuments(updatedDocs, ownerId);
    return newInvoiceId;
  };

  const handleSignAndApprove = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({
        variant: "destructive",
        title: "Signature Required",
        description: "Please provide a signature before approving.",
      });
      return;
    }
    const signature = sigCanvas.current!.toDataURL('image/png');

    if (isPublic) {
      const response = await fetch('/api/public/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareId: documentData.share_token,
          signature,
        }),
      });

      if (!response.ok) {
        if (documentData.userId === 'demo-user') {
          // Keep demo-only fallback for purely local mode.
          await handlePublicSign(signature);
        } else {
          const payload = await response.json().catch(() => ({}));
          toast({
            variant: 'destructive',
            title: 'Signature Error',
            description: payload?.error || 'Could not save signature.',
          });
          return;
        }
      }

      toast({
        title: `${documentData.type} Approved!`,
        description: `Thank you for your business. ${documentData.type === 'Estimate' ? 'A new invoice has been generated.' : ''}`,
      });

      window.location.reload();
      return;
    }

    await signAndProcessDocument(documentData.id, signature);

    toast({
      title: `${documentData.type} Approved!`,
      description: `Thank you for your business. ${documentData.type === 'Estimate' ? 'A new invoice has been generated.' : ''}`,
    });

    router.push('/dashboard');
  }

  const handleDelete = async () => {
    await deleteDocument(documentData.id);
    toast({
      title: "Document Deleted",
      description: `The document has been successfully deleted.`,
    });
    router.push('/dashboard');
  };

  const handleShare = async () => {
    let shareToken = documentData.share_token;

    if (!shareToken && typeof window !== 'undefined') {
      const key = getDocumentsStorageKey(documentData.userId);
      const rawDocs = localStorage.getItem(key);
      const demoDocs = rawDocs ? (JSON.parse(rawDocs) as Document[]) : [];
      const newToken = generateShareToken();

      const updatedDocs = demoDocs.map(doc => {
        if (doc.id !== documentData.id) return doc;
        return { ...doc, share_token: newToken };
      });

      localStorage.setItem(key, JSON.stringify(updatedDocs));
      shareToken = newToken;
    }

    // Ensure the document is synced to backend so public link works
    await forceBackendSync();

    if (!shareToken) {
      toast({
        variant: "destructive",
        title: "Share Link Unavailable",
        description: "This document has no public token yet. Save and try again.",
      });
      return;
    }

    // Construct the public share URL
    const appUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');
    const publicUrl = `${appUrl}/public/${shareToken}`;

    try {
      // Try using the native Share API first
      await navigator.share({
        title: `${documentData.type} from ${co.companyName || 'INVOZY'}`,
        text: `View your ${documentData.type.toLowerCase()}: ${documentData.projectTitle}`,
        url: publicUrl,
      });
    } catch (error) {
      // Fallback to clipboard copy
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast({
          title: "Link Copied!",
          description: "Public link copied to clipboard.",
        });
      } catch (clipboardError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not copy link to clipboard.",
        });
      }
    }

    window.open(publicUrl, '_blank', 'noopener,noreferrer');
    setIsFabMenuOpen(false);
  };

  const handleEdit = () => {
    const editUrl = `/dashboard/${documentData.type.toLowerCase()}s/edit/${documentData.id}`;
    router.push(editUrl);
    setIsFabMenuOpen(false);
  }

  const handleAddFromSigned = async () => {
    await duplicateDocument(documentData.id);
    toast({
      title: `New ${documentData.type} Created`,
      description: `A new draft ${documentData.type.toLowerCase()} has been created from this signed document.`,
    });
    router.push(`/dashboard/${documentData.type.toLowerCase()}s`);
    setIsFabMenuOpen(false);
  }

  const handleGenerateWorkOrder = () => {
    router.push(`/view/work-order/${documentData.id}`);
    setIsFabMenuOpen(false);
  };

  const handleSms = async () => {
    if (!documentData.clientPhone) {
      toast({
        variant: "destructive",
        title: "No Phone Number",
        description: "This client does not have a phone number on file.",
      });
      return;
    }

    let shareToken = documentData.share_token;

    // Generate token if needed
    if (!shareToken && typeof window !== 'undefined') {
      const key = getDocumentsStorageKey(documentData.userId);
      const rawDocs = localStorage.getItem(key);
      const demoDocs = rawDocs ? (JSON.parse(rawDocs) as Document[]) : [];
      const newToken = generateShareToken();

      const updatedDocs = demoDocs.map(doc => {
        if (doc.id !== documentData.id) return doc;
        return { ...doc, share_token: newToken };
      });

      localStorage.setItem(key, JSON.stringify(updatedDocs));
      shareToken = newToken;
    }

    // Ensure document is synced to backend
    await forceBackendSync();

    if (!shareToken) {
      toast({
        variant: "destructive",
        title: "Share Link Unavailable",
        description: "This document has no public token yet. Save and try again.",
      });
      return;
    }

    // Use same URL format as handleShare
    const appUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');
    const publicUrl = `${appUrl}/public/${shareToken}`;

    const message = `View your ${documentData.type.toLowerCase()}: ${documentData.projectTitle}\n${publicUrl}`;
    const smsUrl = `sms:${documentData.clientPhone}?body=${encodeURIComponent(message)}`;

    window.open(smsUrl, '_blank');
    setIsFabMenuOpen(false);
  };

  const handleRecordPayment = async (payment: Omit<Payment, 'id' | 'date'>) => {
    await recordPayment(documentData.id, payment);
    toast({
      title: "Payment Recorded",
      description: `A payment of $${payment.amount.toFixed(2)} has been recorded.`
    })
  }

  const handleEmailSent = () => {
    sendDocument(documentData.id, documentData.type);
    setIsFabMenuOpen(false);
  }

  const documentNumber = documentData.type === 'Estimate' ? documentData.estimateNumber : documentData.invoiceNumber;

  return (
    <div className="bg-background min-h-screen pb-32">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Navigation Bar - Always Visible */}
        <div className="sticky top-4 z-20 mb-4 flex gap-2">
          {isDashboardView ? (
            <Button asChild variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm">
              <Link href="/dashboard">
                <ArrowLeft />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          )}
        </div>
        <Card className="p-8 shadow-lg">
          <CardContent className="p-0">
            <header className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-start mb-8">
              <div>
                {co.companyLogo && (
                  <Image src={co.companyLogo} alt={co.companyName || 'Company Logo'} width={120} height={50} className="object-contain mb-2" />
                )}
                <div className="text-muted-foreground">
                  <p className="font-bold text-foreground">{co.companyName || "Your Company"}</p>
                  <p className="whitespace-pre-line">{co.companyAddress || ""}</p>
                  {co.companyPhone && <p>{co.companyPhone}</p>}
                  {co.companyEmail && <p>{co.companyEmail}</p>}
                  {co.companyWebsite && <p>{co.companyWebsite}</p>}
                  {documentData.taxId && <p>Tax ID: {documentData.taxId}</p>}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h1 className="text-3xl sm:text-4xl font-bold font-headline uppercase break-words">{documentData.type}</h1>
                <p className="text-muted-foreground"># {documentNumber}</p>
                <div className="mt-2">
                  <Badge variant="outline" className={`text-sm ${statusStyles[documentData.status]}`}>{documentData.status}</Badge>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">BILLED TO</h2>
                <p className="font-bold">{documentData.clientName}</p>
                <p className="whitespace-pre-line text-sm">{documentData.clientAddress}</p>
                <p className="text-sm">{documentData.clientEmail}</p>
                <p className="text-sm">{documentData.clientPhone}</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="grid grid-cols-2">
                  <span className="font-semibold">Date Issued:</span>
                  <span>{documentData.issuedDate}</span>
                </div>
                {documentData.dueDate && (
                  <div className="grid grid-cols-2 mt-1">
                    <span className="font-semibold">Date Due:</span>
                    <span>{documentData.dueDate}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator className="my-8" />

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">{documentData.projectTitle}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Item Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentData.lineItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section className="flex justify-end mb-8">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({documentData.taxRate}%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {documentData.type === 'Invoice' && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="text-green-600">-${amountPaid.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Balance Due</span>
                      <span>${balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {documentData.type === 'Estimate' && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            <Separator className="my-8" />

            {documentData.type === 'Invoice' && documentData.payments && documentData.payments.length > 0 && (
              <section className="mb-8">
                <h3 className="font-semibold mb-2">Payment History</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentData.payments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            <section className="mb-8">
              <h3 className="font-semibold mb-2">Client Signature</h3>
              {documentData.isSigned && documentData.signature ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Approved and signed by the client:</p>
                  <Image src={documentData.signature} alt="Client Signature" width={200} height={100} className="rounded-md border bg-white" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border rounded-md w-full h-[200px] bg-gray-50">
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor='black'
                      canvasProps={{ className: 'w-full h-full' }}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={clearSignature}>Clear</Button>
                    <Button onClick={handleSignAndApprove}>Sign & Approve</Button>
                  </div>
                </div>
              )}
            </section>

            <footer className="space-y-4">
              {documentData.projectPhotos && documentData.projectPhotos.length > 0 && (
                <section className="mb-8">
                  <Separator className="my-8" />
                  <h2 className="text-2xl font-bold font-headline mb-4">Project Photos</h2>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {documentData.projectPhotos.map((photo, index) => (
                        photo && photo.url && (
                          <CarouselItem key={index}>
                            <div className="p-1">
                              <div className="relative group">
                                <Image src={photo.url} alt={photo.description || `Project photo ${index + 1}`} width={800} height={600} className="w-full object-cover rounded-lg aspect-video" />
                                {isDashboardView && (
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    onClick={() => downloadHandler(photo.url, `${documentNumber}-photo-${index + 1}.png`)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {photo.description && (
                                <p className="text-sm text-muted-foreground mt-2 text-center">{photo.description}</p>
                              )}
                            </div>
                          </CarouselItem>
                        )
                      ))}
                    </CarouselContent>
                    {documentData.projectPhotos.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </>
                    )}
                  </Carousel>
                </section>
              )}

              {documentData.notes && (
                <div>
                  <h3 className="font-semibold mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{documentData.notes}</p>
                </div>
              )}
              {documentData.terms && (
                <div>
                  <h3 className="font-semibold mb-1">Terms</h3>
                  <p className="text-sm text-muted-foreground">{documentData.terms}</p>
                </div>
              )}
            </footer>

          </CardContent>
        </Card>
      </div>
      {isDashboardView && (
        <div className="fixed bottom-6 right-6 z-30">
          {isFabMenuOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsFabMenuOpen(false)}
            />
          )}
          <div className="relative z-50 flex flex-col items-end gap-4">
            {isFabMenuOpen && (
              <div className="flex flex-col items-end gap-4 transition-all duration-300">
                {documentData.type === 'Invoice' && documentData.isSigned && (
                  <FabMenuItem
                    onClick={handleGenerateWorkOrder}
                    icon={<ClipboardList className="h-6 w-6" />}
                    label="Generate Work Order"
                    variant="default"
                  />
                )}
                {documentData.type === 'Invoice' && documentData.status !== 'Paid' && (
                  <RecordPaymentDialog document={documentData} onRecordPayment={handleRecordPayment}>
                    <FabMenuItem
                      onClick={() => { }}
                      icon={<DollarSign className="h-6 w-6" />}
                      label="Record Payment"
                      variant="default"
                    />
                  </RecordPaymentDialog>
                )}
                <SendEmailDialog
                  document={{...documentData, schedulingUrl: co.schedulingUrl || documentData.schedulingUrl}}
                  companyName={co.companyName || "Your Company"}
                  onEmailSent={handleEmailSent}
                >
                  <FabMenuItem
                    onClick={() => { }}
                    icon={<Mail className="h-6 w-6" />}
                    label="Email to Client"
                    variant="outline"
                    className="bg-background"
                  />
                </SendEmailDialog>
                <FabMenuItem
                  onClick={handleSms}
                  icon={<MessageSquare className="h-6 w-6" />}
                  label="Send SMS"
                  variant="outline"
                  className="bg-background"
                />
                {documentData.isSigned ? (
                  <FabMenuItem
                    onClick={handleAddFromSigned}
                    icon={<Plus className="h-6 w-6" />}
                    label="Add"
                  />
                ) : (
                  <FabMenuItem
                    onClick={handleEdit}
                    icon={<Edit className="h-6 w-6" />}
                    label="Edit"
                  />
                )}
                <FabMenuItem
                  onClick={handleShare}
                  icon={<Share2 className="h-6 w-6" />}
                  label="Share"
                />
                <DeleteDocumentDialog onDelete={handleDelete}>
                  <FabMenuItem
                    onClick={() => { }}
                    icon={<Trash2 className="h-6 w-6" />}
                    label="Delete"
                    variant="destructive"
                  />
                </DeleteDocumentDialog>
              </div>
            )}
            <Button
              size="icon"
              className="rounded-full h-16 w-16 shadow-xl"
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            >
              {isFabMenuOpen ? <X className="h-7 w-7" /> : <MoreVertical className="h-7 w-7" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
