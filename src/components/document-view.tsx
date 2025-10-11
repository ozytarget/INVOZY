'use client'

import { Document } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Logo } from "./logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useEffect, useState } from "react";
import Image from "next/image";

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
}

export function DocumentView({ document }: DocumentViewProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

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

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
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
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${document.amount.toFixed(2)}</span>
                    </div>
                </div>
            </section>

            <Separator className="my-8" />
            
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
    </div>
  );
}

    