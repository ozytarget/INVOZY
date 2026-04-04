
'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { Document, Client } from "@/lib/types"
import { useDocuments } from "@/hooks/use-documents"
import { Input } from "@/components/ui/input"
import { X, FileText, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClientDetailSheet } from "@/components/clients/client-detail-sheet"

interface Props {
  children: React.ReactNode
}

export function SearchDialog({ children }: Props) {
  const [searchActive, setSearchActive] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [clientSheetOpen, setClientSheetOpen] = React.useState(false);
  const router = useRouter();
  const { documents, clients } = useDocuments();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchActive]);

  const filteredDocs = React.useMemo(() => {
    if (!searchValue) return [];
    const search = searchValue.toLowerCase();
    return documents.filter(doc => {
      const clientName = (doc.clientName || '').toLowerCase();
      const projectTitle = (doc.projectTitle || '').toLowerCase();
      const docNumber = (doc.invoiceNumber || doc.estimateNumber || '').toLowerCase();
      return clientName.includes(search) || projectTitle.includes(search) || docNumber.includes(search);
    }).slice(0, 8);
  }, [documents, searchValue]);

  const filteredClients = React.useMemo(() => {
    if (!searchValue) return [];
    const search = searchValue.toLowerCase();
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.phone || '').toLowerCase().includes(search)
    ).slice(0, 4);
  }, [clients, searchValue]);

  const hasResults = filteredDocs.length > 0 || filteredClients.length > 0;

  const handleSelectDoc = (doc: Document) => {
    router.push(`/view/${doc.type.toLowerCase()}/${doc.id}`)
    setSearchActive(false);
    setSearchValue("");
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSheetOpen(true);
    setSearchActive(false);
    setSearchValue("");
  }

  if (!searchActive) {
    return (
      <>
        <div onClick={() => setSearchActive(true)}>
          {children}
        </div>
        <ClientDetailSheet
          client={selectedClient}
          isOpen={clientSheetOpen}
          onClose={() => setClientSheetOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm dark:bg-background/95 dark:border-border">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              placeholder="Search clients, documents, projects..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 bg-white text-slate-900 border-slate-300 placeholder:text-slate-500 focus-visible:ring-slate-500 dark:bg-background dark:text-foreground dark:border-input"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSearchActive(false); setSearchValue(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {searchValue && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {!hasResults && (
                <div className="text-center py-8 text-slate-600 dark:text-muted-foreground">
                  No results for "{searchValue}"
                </div>
              )}

              {filteredClients.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-700 dark:text-muted-foreground uppercase tracking-wide px-1 pb-1">Clients</p>
                  {filteredClients.map((client) => (
                    <div
                      key={client.email}
                      onClick={() => handleSelectClient(client)}
                      className="p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-3 dark:border-border dark:bg-card dark:hover:bg-accent"
                    >
                      <User className="h-4 w-4 text-slate-500 dark:text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-foreground">{client.name}</p>
                        <p className="text-xs text-slate-600 dark:text-muted-foreground">{client.email} · {client.documentCount} doc(s)</p>
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-muted-foreground shrink-0">
                        ${client.totalBilled.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {filteredDocs.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-700 dark:text-muted-foreground uppercase tracking-wide px-1 pb-1 pt-2">Documents</p>
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className="p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-3 dark:border-border dark:bg-card dark:hover:bg-accent"
                    >
                      <FileText className="h-4 w-4 text-slate-500 dark:text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-foreground">
                          {doc.type === 'Invoice' ? doc.invoiceNumber : doc.estimateNumber} - {doc.projectTitle}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-muted-foreground">{doc.clientName}</p>
                      </div>
                      <span className="text-xs text-slate-700 dark:text-muted-foreground shrink-0">{doc.type}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <ClientDetailSheet
        client={selectedClient}
        isOpen={clientSheetOpen}
        onClose={() => setClientSheetOpen(false)}
      />
    </>
  )
}

