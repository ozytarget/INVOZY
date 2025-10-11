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
import type { Client } from "@/lib/types";

export function ClientsList() {
  const { clients } = useDocuments();

  const handleRowClick = (client: Client) => {
    // TODO: Navigate to client details page
    console.log("Navigating to client:", client.name);
  };
  
  const sortedClients = [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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
            {sortedClients.map((client) => (
              <TableRow key={`${client.email}-${client.name}`} onClick={() => handleRowClick(client)} className="cursor-pointer">
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
