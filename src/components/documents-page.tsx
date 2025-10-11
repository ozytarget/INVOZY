
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
  DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import { useDocuments } from "@/hooks/use-documents"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { DeleteDocumentMenuItem } from "./delete-document-dialog"

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
  const { documents, deleteDocument, duplicateDocument } = useDocuments();
  const router = useRouter();
  const { toast } = useToast();
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

  const handleDelete = (docId: string) => {
    deleteDocument(docId);
    toast({
        title: "Document Deleted",
        description: `The document has been successfully deleted.`,
    });
  }

  const handleDuplicate = (doc: Document) => {
    duplicateDocument(doc.id);
     toast({
        title: "Document Duplicated",
        description: `A new draft has been created from ${doc.id}.`,
    });
    router.push(createHref); // Navigate to create page to see the new draft (or just stay here)
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
          {/* Desktop View */}
          <div className="hidden md:block">
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
                          <DropdownMenuItem onClick={() => handleRowClick(doc)}>View / Edit</DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href={getViewLink(doc)} target="_blank">View Public Page</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(doc)}>Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DeleteDocumentMenuItem onDelete={() => handleDelete(doc.id)} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 space-y-2 cursor-pointer relative" onClick={() => handleRowClick(doc)}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-medium">{doc.clientName}</div>
                        <div className="text-sm text-muted-foreground">{doc.type} #{doc.id}</div>
                    </div>
                    <Badge className={statusStyles[doc.status]} variant="outline">
                        {doc.status}
                    </Badge>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <div className="text-muted-foreground">
                        <p>Issued: {doc.issuedDate}</p>
                        {doc.dueDate && <p>Due: {doc.dueDate}</p>}
                    </div>
                    <span className="font-bold text-base">${doc.amount.toLocaleString()}</span>
                </div>
                 <div className="absolute top-2 right-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleRowClick(doc)}>View / Edit</DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href={getViewLink(doc)} target="_blank">View Public Page</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(doc)}>Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DeleteDocumentMenuItem onDelete={() => handleDelete(doc.id)} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                 </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>
    </>
  )
}
