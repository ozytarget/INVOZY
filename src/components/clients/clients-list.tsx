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
  phone: string;
  address: string;
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
        phone: doc.clientPhone,
        address: doc.clientAddress,
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

  const handleRowClick = (client: Client) => {
    // TODO: Navigate to client details page
    console.log("Navigating to client:", client.name);
  };

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
              <TableHead>Contact</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Total Billed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.email} onClick={() => handleRowClick(client)} className="cursor-pointer">
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{client.email}</div>
                  <div className="text-sm text-muted-foreground">{client.phone}</div>
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
