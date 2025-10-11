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

const statusStyles: Record<DocumentStatus, string> = {
  Paid: "text-primary bg-primary/10",
  Sent: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50",
  Draft: "text-muted-foreground bg-muted",
  Overdue: "text-destructive-foreground bg-destructive/80",
  Partial: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/50",
}

export function RecentDocumentsTable() {
  const { documents } = useDocuments();

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>
          A list of your most recent invoices and estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="font-medium">{doc.clientName}</div>
                  <div className="text-sm text-muted-foreground">
                    {doc.clientEmail}
                  </div>
                </TableCell>
                <TableCell>{doc.type}</TableCell>
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
      </CardContent>
    </Card>
  )
}
