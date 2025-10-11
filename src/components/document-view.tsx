
'use client'

import { Document, Payment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Logo } from "./logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "./ui/button";
import { useDocuments } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Share2, Edit, Trash2, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { RecordPaymentDialog } from "./invoices/record-payment-dialog";


type DocumentViewProps = {
  document: Document;
}

type CompanySettings = {
    companyName: string;
    companyAddress: string;
    companyLogo: string;
    taxId?: string;
}

const statusStyles: Record<Document['status'], string> = {
  Paid: "border-primary text-primary",
  Sent: "border-blue-500 text-blue-500",
  Draft: "border-gray-500 text-gray-500",
  Overdue: "border-destructive text-destructive",
  Partial: "border-orange-500 text-orange-500",
  Approved: "border-green-500 text-green-500",
}

export function DocumentView({ document }: DocumentViewProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { signAndProcessDocument, deleteDocument, recordPayment } = useDocuments();
  const { toast } = useToast();
  const router = useRouter();
  const [isDashboardView, setIsDashboardView] = useState(false);

  useEffect(() => {
    // A simple check to see if this view is loaded inside the main dashboard flow
    // or as a standalone public page.
    if (window.self !== window.top) {
        setIsDashboardView(true);
    }
  }, []);


  useEffect(() => {
    const handleStorageChange = () => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem("companySettings");
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        }
    }
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const subtotal = document.lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const amountPaid = document.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  const balanceDue = document.amount - amountPaid;


  const clearSignature = () => {
    sigCanvas.current?.clear();
  }

  const handleSignAndApprove = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({
        variant: "destructive",
        title: "Signature Required",
        description: "Please provide a signature before approving.",
      });
      return;
    }
    const signature = sigCanvas.current!.toDataURL('image/png');
    const newInvoiceId = signAndProcessDocument(document.id, signature);

    toast({
      title: `${document.type} Approved!`,
      description: `Thank you for your business. ${document.type === 'Estimate' ? 'A new invoice has been generated.' : ''}`,
    });

    if (newInvoiceId) {
      router.push(`/view/invoice/${newInvoiceId}`);
    }
  }

   const handleDelete = () => {
    deleteDocument(document.id);
    toast({
      title: "Document Deleted",
      description: `The document has been successfully deleted.`,
    });
    router.push('/dashboard');
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
        await navigator.share({
            title: `${document.type} from ${settings?.companyName || 'invozzy'}`,
            text: `View your ${document.type.toLowerCase()}: ${document.projectTitle}`,
            url: url,
        });
    } catch (error) {
        // Fallback to clipboard if share API fails or is not available
        await navigator.clipboard.writeText(url);
        toast({
            title: "Link Copied",
            description: "The public link has been copied to your clipboard.",
        });
    }
  };

  const handleRecordPayment = (payment: Omit<Payment, 'id' | 'date'>) => {
    recordPayment(document.id, payment);
    toast({
      title: "Payment Recorded",
      description: `A payment of $${payment.amount.toFixed(2)} has been recorded.`
    })
  }

  return (
    <div className="bg-background min-h-screen pb-32">
       <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {isDashboardView && (
            <div className="sticky top-4 z-20 mb-4">
                <Button asChild variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm">
                    <Link href="/dashboard">
                        <ArrowLeft />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
            </div>
        )}
        <Card className="p-8 shadow-lg">
          <CardContent className="p-0">
            <header className="flex justify-between items-start mb-8">
              <div>
                {settings?.companyLogo ? (
                    <Image src={settings.companyLogo} alt={settings.companyName || 'Company Logo'} width={120} height={50} className="object-contain" />
                ) : (
                    <Logo />
                )}
                <div className="mt-2 text-muted-foreground">
                    <p className="font-bold text-foreground">{settings?.companyName || "Your Company"}</p>
                    <p className="whitespace-pre-line">{settings?.companyAddress || "123 Contractor Lane\nBuildsville, ST 12345"}</p>
                    {settings?.taxId && <p>Tax ID: {settings.taxId}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-bold font-headline uppercase">{document.type}</h1>
                <p className="text-muted-foreground"># {document.id}</p>
                <div className="mt-2">
                  <Badge variant="outline" className={`text-sm ${statusStyles[document.status]}`}>{document.status}</Badge>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">BILLED TO</h2>
                <p className="font-bold">{document.clientName}</p>
                <p className="whitespace-pre-line text-sm">{document.clientAddress}</p>
                <p className="text-sm">{document.clientEmail}</p>
                <p className="text-sm">{document.clientPhone}</p>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-2">
                  <span className="font-semibold">Date Issued:</span>
                  <span>{document.issuedDate}</span>
                </div>
                {document.dueDate && (
                    <div className="grid grid-cols-2 mt-1">
                        <span className="font-semibold">Date Due:</span>
                        <span>{document.dueDate}</span>
                    </div>
                )}
              </div>
            </section>
            
            <Separator className="my-8" />

            <section className="mb-8">
                <h2 className="text-2xl font-bold font-headline mb-4">{document.projectTitle}</h2>
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
                        {document.lineItems.map(item => (
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
                     {document.type === 'Invoice' && (
                        <>
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
                    {document.type === 'Estimate' && (
                         <>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${document.amount.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <Separator className="my-8" />

            {document.type === 'Invoice' && document.payments && document.payments.length > 0 && (
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
                              {document.payments.map(payment => (
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
                {document.isSigned && document.signature ? (
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Approved and signed by the client:</p>
                        <Image src={document.signature} alt="Client Signature" width={200} height={100} className="rounded-md border bg-white" />
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
                {document.notes && (
                    <div>
                        <h3 className="font-semibold mb-1">Notes</h3>
                        <p className="text-sm text-muted-foreground">{document.notes}</p>
                    </div>
                )}
                 {document.terms && (
                    <div>
                        <h3 className="font-semibold mb-1">Terms</h3>
                        <p className="text-sm text-muted-foreground">{document.terms}</p>
                    </div>
                )}
            </footer>

          </CardContent>
        </Card>
      </div>
       {isDashboardView && (
            <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-20 items-center justify-center gap-4">
                    {document.type === 'Invoice' && document.status !== 'Paid' && (
                        <RecordPaymentDialog document={document} onRecordPayment={handleRecordPayment}>
                             <Button variant="default" size="lg">
                                <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                            </Button>
                        </RecordPaymentDialog>
                    )}
                     <Button variant="outline" size="lg" disabled>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <DeleteDocumentDialog onDelete={handleDelete}>
                        <Button variant="destructive" size="lg">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </DeleteDocumentDialog>
                </div>
            </div>
        )}
    </div>
  );
}
