

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DocumentStatus } from "@/lib/types"
import { useDocuments } from "@/hooks/use-documents"
import { useRouter } from "next/navigation";

const statusStyles: Record<DocumentStatus, string> = {
  Paid: "text-primary bg-primary/10",
  Sent: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50",
  Draft: "text-muted-foreground bg-muted",
  Overdue: "text-destructive-foreground bg-destructive/80",
  Partial: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/50",
  Approved: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50",
}

export function RecentDocumentsTable() {
  const { documents } = useDocuments();
  const router = useRouter();

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
    .slice(0, 5)

  const handleRowClick = (docId: string, docType: string) => {
    router.push(`/view/${docType.toLowerCase()}/${docId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>
          A list of your most recent invoices and estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDocuments.map((doc) => (
                <TableRow key={doc.id} onClick={() => handleRowClick(doc.id, doc.type)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{doc.clientName}</div>
                    <div className="text-sm text-muted-foreground">
                      {doc.clientEmail}
                    </div>
                  </TableCell>
                  <TableCell>{doc.type} #{doc.type === 'Estimate' ? doc.estimateNumber : doc.invoiceNumber}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={statusStyles[doc.status]}
                      variant="outline"
                    >
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.issuedDate}</TableCell>
                  <TableCell className="text-right">
                    ${doc.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {recentDocuments.map(doc => (
            <div key={doc.id} className="border rounded-lg p-4 space-y-2 cursor-pointer" onClick={() => handleRowClick(doc.id, doc.type)}>
              <div className="flex justify-between items-center">
                <div className="font-medium">{doc.clientName}</div>
                 <Badge className={statusStyles[doc.status]} variant="outline">{doc.status}</Badge>
              </div>
               <div className="text-sm text-muted-foreground">{doc.type} #{doc.type === 'Estimate' ? doc.estimateNumber : doc.invoiceNumber}</div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{doc.issuedDate}</span>
                <span className="font-bold">${doc.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
