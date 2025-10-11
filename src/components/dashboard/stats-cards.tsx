'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDocuments } from "@/hooks/use-documents"
import { DollarSign, FileText, FileSignature, TrendingUp, Construction } from "lucide-react"

export function StatsCards() {
  const { documents } = useDocuments();

  const paidInvoices = documents.filter(
    (doc) => doc.type === 'Invoice' && doc.status === 'Paid'
  );

  const totalRevenue = paidInvoices.reduce((sum, doc) => sum + doc.amount, 0);

  const { grossProfit, materialsCost } = paidInvoices.reduce(
    (acc, invoice) => {
      invoice.lineItems.forEach((item) => {
        const itemTotal = item.quantity * item.price;
        // A simple heuristic: if "labor" is in the description, it's profit. Otherwise, it's material cost.
        if (item.description.toLowerCase().includes('labor')) {
          acc.grossProfit += itemTotal;
        } else {
          acc.materialsCost += itemTotal;
        }
      });
      return acc;
    },
    { grossProfit: 0, materialsCost: 0 }
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
            ${totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            from paid invoices
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
            ${grossProfit.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated earnings from labor charges.
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
            ${materialsCost.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated cost of materials from paid invoices.
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
