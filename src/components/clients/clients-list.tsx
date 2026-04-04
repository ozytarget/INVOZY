"use client"

import { useState } from "react"
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
import type { Client } from "@/lib/types"
import { ClientDetailSheet } from "./client-detail-sheet"

export function ClientsList() {
  const { clients } = useDocuments()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (client: Client) => {
    setSelectedClient(client)
    setSheetOpen(true)
  }

  const sortedClients = [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
          <CardDescription>
            Click a client to view details, history and edit their info.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop View */}
          <div className="hidden md:block">
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
                  <TableRow
                    key={`${client.email}-${client.name}`}
                    onClick={() => handleRowClick(client)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
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
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {sortedClients.map((client) => (
              <div
                key={`${client.email}-${client.name}`}
                onClick={() => handleRowClick(client)}
                className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-muted-foreground">
                  <p>{client.email}</p>
                  <p>{client.phone}</p>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="text-muted-foreground">{client.documentCount} document(s)</span>
                  <span className="font-bold">${client.totalBilled.toLocaleString()} billed</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClientDetailSheet
        client={selectedClient}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}

