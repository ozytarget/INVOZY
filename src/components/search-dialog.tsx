
'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { Document } from "@/lib/types"
import { useDocuments } from "@/hooks/use-documents"
import { Input } from "@/components/ui/input"
import { X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
}

export function SearchDialog({ children }: Props) {
  const [searchActive, setSearchActive] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("");
  const router = useRouter();
  const { documents } = useDocuments();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchActive]);

  // Filter documents based on search value
  const filteredDocs = React.useMemo(() => {
    if (!searchValue) return [];
    
    const search = searchValue.toLowerCase();
    return documents.filter(doc => {
      const clientName = (doc.clientName || '').toLowerCase();
      const projectTitle = (doc.projectTitle || '').toLowerCase();
      const docNumber = (doc.invoiceNumber || doc.estimateNumber || '').toLowerCase();
      
      return (
        clientName.includes(search) ||
        projectTitle.includes(search) ||
        docNumber.includes(search)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [documents, searchValue]);

  const handleSelect = (doc: Document) => {
    router.push(`/view/${doc.type.toLowerCase()}/${doc.id}`)
    setSearchActive(false);
    setSearchValue("");
  }

  if (!searchActive) {
    return (
      <div onClick={() => setSearchActive(true)}>
        {children}
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            placeholder="Search by client, title, or document number..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearchActive(false);
              setSearchValue("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {searchValue && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredDocs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No documents found for "{searchValue}"
              </div>
            )}
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelect(doc)}
                className="p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors flex items-center gap-3"
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {doc.type === 'Invoice' ? `INV-${doc.invoiceNumber}` : `EST-${doc.estimateNumber}`} - {doc.projectTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Client: {doc.clientName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
