

'use client';

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useDocuments } from "@/hooks/use-documents-supabase"
import { DollarSign, FileSignature, TrendingUp, Construction, Percent, Download, FileText } from "lucide-react"
import { Document, LineItem } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "../ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type DetailItem = {
    invoiceNumber?: string;
    clientName: string;
    description: string;
    amount: number;
}

function DetailDialog({ title, items, total, trigger }: { title: string, items: DetailItem[], total: number, trigger: React.ReactNode }) {
    
    const handleDownload = () => {
        const headers = ['Invoice #', 'Client', 'Description', 'Amount'];
        const csvRows = [headers.join(',')];

        for (const item of items) {
            const values = [
                item.invoiceNumber || 'N/A',
                item.clientName,
                item.description,
                item.amount.toFixed(2)
            ].map(v => `"${v.replace(/"/g, '""')}"`); // Escape quotes
            csvRows.push(values.join(','));
        }
        
        csvRows.push(['', '', 'Total', `"${total.toFixed(2)}"`].join(','));

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute('download', `${safeTitle}_breakdown.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="h-[60vh]">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Badge variant="outline">{item.invoiceNumber}</Badge></TableCell>
                                        <TableCell>{item.clientName}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                                    <TableCell className="text-right font-bold text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2" />
                        Download CSV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function StatCard({ title, value, subtext, icon, detailItems, total }: { title: string, value: string, subtext: string, icon: React.ReactNode, detailItems?: DetailItem[], total?: number }) {
    const cardContent = (
        <Card className={detailItems ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {value}
              </div>
              <p className="text-xs text-muted-foreground">
                {subtext}
              </p>
            </CardContent>
        </Card>
    );

    if (detailItems && total) {
        return (
            <DetailDialog title={`Breakdown: ${title}`} items={detailItems} total={total} trigger={cardContent} />
        )
    }

    return cardContent;
}


export function StatsCards() {
  const { documents } = useDocuments();

  const paidInvoices = documents.filter(
    (doc) => doc.type === 'Invoice' && (doc.status === 'Paid' || doc.status === 'Partial')
  );

  const { totalRevenue, grossProfit, materialsCost, taxesCollected, revenueDetails, profitDetails, materialDetails } = paidInvoices.reduce(
    (acc, invoice) => {
      const amountPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const paymentRatio = invoice.amount > 0 ? amountPaid / invoice.amount : 0;
      
      acc.totalRevenue += amountPaid;
      if (amountPaid > 0) {
          acc.revenueDetails.push({
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            description: `Payment received for "${invoice.projectTitle}"`,
            amount: amountPaid,
          });
      }

      const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxAmount = invoice.taxRate ? subtotal * (invoice.taxRate / 100) : 0;
      
      acc.taxesCollected += taxAmount * paymentRatio;

      invoice.lineItems.forEach((item) => {
        const itemTotal = item.quantity * item.price;
        const recognizedAmount = itemTotal * paymentRatio;
        if (item.description.toLowerCase().includes('labor')) {
          acc.grossProfit += recognizedAmount;
          if (recognizedAmount > 0) {
            acc.profitDetails.push({
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                description: item.description,
                amount: recognizedAmount,
            });
          }
        } else {
          acc.materialsCost += recognizedAmount;
          if (recognizedAmount > 0) {
            acc.materialDetails.push({
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                description: item.description,
                amount: recognizedAmount,
            });
          }
        }
      });

      return acc;
    },
    { 
        totalRevenue: 0, 
        grossProfit: 0, 
        materialsCost: 0, 
        taxesCollected: 0,
        revenueDetails: [] as DetailItem[],
        profitDetails: [] as DetailItem[],
        materialDetails: [] as DetailItem[],
    }
  );

  const invoiceCount = documents.filter(doc => doc.type === 'Invoice').length;
  const estimateCount = documents.filter(doc => doc.type === 'Estimate').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext="from paid & partially paid invoices"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            detailItems={revenueDetails}
            total={totalRevenue}
        />
        <StatCard 
            title="Gross Profit (Labor)"
            value={`$${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext="Recognized profit from paid portions"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            detailItems={profitDetails}
            total={grossProfit}
        />
        <StatCard 
            title="Materials Cost"
            value={`$${materialsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext="Recognized cost from paid portions"
            icon={<Construction className="h-4 w-4 text-muted-foreground" />}
            detailItems={materialDetails}
            total={materialsCost}
        />
        <StatCard 
            title="Taxes Collected"
            value={`$${taxesCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext="From paid & partially paid invoices"
            icon={<Percent className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
            title="Invoices"
            value={`+${invoiceCount}`}
            subtext="Total invoices generated"
            icon={<FileSignature className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
            title="Estimates"
            value={`+${estimateCount}`}
            subtext="Total estimates created"
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
    </div>
  )
}
