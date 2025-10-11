"use client"

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
import { useDocuments } from "@/hooks/use-documents"

type Client = {
  name: string
  email: string
  totalBilled: number
  documentCount: number
}

export function ClientsList() {
  const { documents } = useDocuments();

  const clientsMap = new Map<string, Client>()

  documents.forEach((doc) => {
    let client = clientsMap.get(doc.clientEmail)
    if (!client) {
      client = {
        name: doc.clientName,
        email: doc.clientEmail,
        totalBilled: 0,
        documentCount: 0,
      }
    }
    if (doc.type === "Invoice") {
      client.totalBilled += doc.amount
    }
    client.documentCount += 1
    clientsMap.set(doc.clientEmail, client)
  })

  const clients = Array.from(clientsMap.values())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Clients</CardTitle>
        <CardDescription>
          A list of all your clients from invoices and estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Total Billed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.email}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email}
                </TableCell>
                <TableCell>{client.documentCount}</TableCell>
                <TableCell className="text-right">
                  ${client.totalBilled.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
