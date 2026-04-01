
'use client'

import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { Document } from "@/lib/types"
import { useUser } from "@/supabase/provider"

interface Props {
  children: React.ReactNode
}

export function SearchDialog({ children }: Props) {
  const [open, setOpen] = React.useState(false)
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [searchValue, setSearchValue] = React.useState("");
  const router = useRouter();
  const { user } = useUser();

  // Load documents when dialog opens
  React.useEffect(() => {
    if (!open) return;

    const loadDocuments = async () => {
      try {
        console.log('[Search] Loading documents for user:', user?.id);
        
        // Try backend first
        if (user) {
          const res = await fetch('/api/state', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            const docs = Array.isArray(data?.documents_json) ? data.documents_json : [];
            console.log('[Search] ✓ Loaded from API:', docs.length, 'documents');
            setDocuments(docs);
            return;
          }
        }

        // Fallback to localStorage
        const key = user?.id ? `demoDocuments:${user.id}` : 'demoDocuments';
        const raw = localStorage.getItem(key);
        const docs = raw ? JSON.parse(raw) : [];
        console.log('[Search] Loaded from localStorage:', docs.length, 'documents');
        setDocuments(docs);
      } catch (err) {
        console.error('[Search] Error loading documents:', err);
      }
    };

    loadDocuments();
  }, [open, user?.id]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  const handleSelect = (doc: Document) => {
    router.push(`/view/${doc.type.toLowerCase()}/${doc.id}`)
    setOpen(false)
  }

  // Filter documents based on search value
  const filteredDocs = documents.filter(doc => {
    const search = searchValue.toLowerCase();
    const clientName = (doc.clientName || '').toLowerCase();
    const projectTitle = (doc.projectTitle || '').toLowerCase();
    const docNumber = (doc.invoiceNumber || doc.estimateNumber || '').toLowerCase();
    
    return (
      clientName.includes(search) ||
      projectTitle.includes(search) ||
      docNumber.includes(search)
    );
  });

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search documents by client, title, or number..." 
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          {filteredDocs.length === 0 && (
            <CommandEmpty>
              {documents.length === 0 ? 'No documents found.' : 'No results found.'}
            </CommandEmpty>
          )}
          {filteredDocs.length > 0 && (
            <CommandGroup heading={`Documents (${filteredDocs.length})`}>
              {filteredDocs.map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={`${doc.clientName} ${doc.projectTitle} ${doc.invoiceNumber || doc.estimateNumber}`}
                  onSelect={() => handleSelect(doc)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{doc.type === 'Invoice' ? `INV-${doc.invoiceNumber}` : `EST-${doc.estimateNumber}`} - {doc.projectTitle} ({doc.clientName})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
