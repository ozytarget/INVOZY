
'use client';

import { useRef, useState } from "react";
import { ClientsList } from "@/components/clients/clients-list";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/use-documents";
import { Download, PlusCircle, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/types";

function ClientsPageContent() {
  const { clients, addClient } = useDocuments();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";

    const headers = ['name', 'email', 'phone', 'address'];
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headerMap = {
          // App's internal field: [Possible CSV header names]
          name: ['name', 'Name', 'Client Name'],
          email: ['email', 'Email', 'Email Address'],
          phone: ['phone', 'Phone', 'Phone (mobile)', 'Phone (other)'],
          address: ['address', 'Address', 'Address 2', 'City', 'State / Province', 'Zip / Postal Code'],
        };

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of results.data as any[]) {
          const clientName = headerMap.name.map(h => row[h]).find(val => val) || '';
          const clientEmail = headerMap.email.map(h => row[h]).find(val => val) || '';

          // If no name or email, skip this row. Email is crucial.
          if (!clientName || !clientEmail) {
            skippedCount++;
            continue;
          }

          const clientPhone = headerMap.phone.map(h => row[h]).find(val => val) || '';

          // Combine multiple address fields into one
          const addressParts = headerMap.address
            .map(h => row[h])
            .filter(Boolean); // Filter out empty parts
          const clientAddress = addressParts.join(', ').replace(/, ,/g, ',');

          try {
            await addClient({
              name: clientName,
              email: clientEmail,
              address: clientAddress || 'N/A', // Provide a default if address is empty
              phone: clientPhone,
            });
            importedCount++;
          } catch (error) {
            console.error("Error importing client:", row, error);
            skippedCount++;
          }
        }

        toast({
          title: "Import Complete",
          description: `${importedCount} clients were successfully imported. ${skippedCount > 0 ? `${skippedCount} rows were skipped.` : ''}`,
        });

        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: `Error parsing CSV file: ${error.message}`,
        });
        setIsImporting(false);
      }
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Clients</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv"
          />
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
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

export default function ClientsPage() {
  return <ClientsPageContent />;
}
