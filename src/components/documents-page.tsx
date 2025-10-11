'use client'

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
import { Button } from "@/components/ui/button"
import { Document, DocumentStatus, DocumentType } from "@/lib/types"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useDocuments } from "@/hooks/use-documents"
import { useRouter } from "next/navigation"

const statusStyles: Record<DocumentStatus, string> = {
  Paid: "text-primary bg-primary/10",
  Sent: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50",
  Draft: "text-muted-foreground bg-muted",
  Overdue: "text-destructive-foreground bg-destructive/80",
  Partial: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/50",
  Approved: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50",
}

type DocumentsPageProps = {
  type: DocumentType
}

export function DocumentsPage({ type }: DocumentsPageProps) {
  const { documents } = useDocuments();
  const router = useRouter();
  const title = type === "Estimate" ? "Estimates" : "Invoices"
  const createHref = type === "Estimate" ? "/dashboard/estimates/create" : "/dashboard/invoices/create"
  
  const filteredDocuments = documents.filter(doc => doc.type === type)

  const getViewLink = (doc: Document) => {
    const docType = doc.type.toLowerCase();
    return `/view/${docType}/${doc.id}`;
  }

  const handleRowClick = (doc: Document) => {
    router.push(getViewLink(doc));
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">{title}</h1>
        <Button asChild>
          <Link href={createHref}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create {type}
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your {title.toLowerCase()}</CardTitle>
          <CardDescription>
            Here is a list of all your {title.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Issued Date</TableHead>
                {type === "Invoice" && <TableHead>Due Date</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} onClick={() => handleRowClick(doc)} className="cursor-pointer">
                  <TableCell className="font-medium">{doc.clientName}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusStyles[doc.status]} variant="outline">
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.issuedDate}</TableCell>
                  {type === "Invoice" && <TableCell>{doc.dueDate}</TableCell>}
                  <TableCell className="text-right">${doc.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={getViewLink(doc)} target="_blank">View Public Page</Link></DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
