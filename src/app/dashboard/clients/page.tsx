
'use client';

import { ClientsList } from "@/components/clients/clients-list";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/use-documents";
import { Download, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function ClientsPage() {
  const { clients } = useDocuments();

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    
    const headers = ['name', 'email', 'phone', 'address'];
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const handleExport = () => {
    const csvData = convertToCSV(clients);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'clients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Clients</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={clients.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href="/dashboard/clients/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>
      <ClientsList />
    </div>
  );
}
