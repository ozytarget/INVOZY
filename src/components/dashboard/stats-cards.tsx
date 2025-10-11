
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDocuments } from "@/hooks/use-documents"
import { DollarSign, FileText, FileSignature, TrendingUp, Construction, Percent } from "lucide-react"

export function StatsCards() {
  const { documents } = useDocuments();

  const paidInvoices = documents.filter(
    (doc) => doc.type === 'Invoice' && (doc.status === 'Paid' || doc.status === 'Partial')
  );

  const { totalRevenue, grossProfit, materialsCost, taxesCollected } = paidInvoices.reduce(
    (acc, invoice) => {
      // For partial payments, we should only account for the portion of revenue that has been paid.
      const amountPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Calculate the ratio of payment against the total amount due.
      const paymentRatio = invoice.amount > 0 ? amountPaid / invoice.amount : 0;
      
      // The revenue recognized is the amount actually paid.
      acc.totalRevenue += amountPaid;
      
      const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxAmount = invoice.taxRate ? subtotal * (invoice.taxRate / 100) : 0;
      
      // Apportion the collected tax based on the payment ratio
      acc.taxesCollected += taxAmount * paymentRatio;

      // Apportion costs and profit based on the payment ratio
      invoice.lineItems.forEach((item) => {
        const itemTotal = item.quantity * item.price;
        if (item.description.toLowerCase().includes('labor')) {
          acc.grossProfit += itemTotal * paymentRatio;
        } else {
          acc.materialsCost += itemTotal * paymentRatio;
        }
      });

      return acc;
    },
    { totalRevenue: 0, grossProfit: 0, materialsCost: 0, taxesCollected: 0 }
  );

  const invoiceCount = documents.filter(doc => doc.type === 'Invoice').length;
  const estimateCount = documents.filter(doc => doc.type === 'Estimate').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            from paid & partially paid invoices
          </p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gross Profit (Labor)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Recognized profit from paid portions.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Materials Cost</CardTitle>
          <Construction className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${materialsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Recognized cost from paid portions.
          </p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxes Collected</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${taxesCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            From paid & partially paid invoices.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          <FileSignature className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{invoiceCount}</div>
          <p className="text-xs text-muted-foreground">
            Total invoices generated
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimates</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{estimateCount}</div>
          <p className="text-xs text-muted-foreground">
            Total estimates created
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
