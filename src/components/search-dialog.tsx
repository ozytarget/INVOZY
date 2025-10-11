
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
import { useDocuments } from "@/hooks/use-documents"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { Document } from "@/lib/types"

interface Props {
  children: React.ReactNode
}

export function SearchDialog({ children }: Props) {
  const [open, setOpen] = React.useState(false)
  const { documents } = useDocuments();
  const router = useRouter();

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

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documents by client, title, or number..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Documents">
            {documents.map((doc) => (
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
        </CommandList>
      </CommandDialog>
    </>
  )
}
