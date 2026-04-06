"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { useDocuments } from "@/hooks/use-documents"
import type { Client, Document } from "@/lib/types"
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle,
  Edit2,
  Save,
  X,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ClientDetailSheetProps = {
  client: Client | null
  isOpen: boolean
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-100 text-green-800 border-green-200",
  Approved: "bg-blue-100 text-blue-800 border-blue-200",
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Sent: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Partial: "bg-orange-100 text-orange-800 border-orange-200",
  Overdue: "bg-red-100 text-red-800 border-red-200",
}

export function ClientDetailSheet({ client, isOpen, onClose }: ClientDetailSheetProps) {
  const { documents, updateClient } = useDocuments()
  const { toast } = useToast()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", secondaryEmail: "" })

  // All docs belonging to this client
  const clientDocs: Document[] = useMemo(() => {
    if (!client) return []
    return documents
      .filter(d => d.clientEmail?.toLowerCase() === client.email?.toLowerCase())
      .sort((a, b) => (b.issuedDate || "").localeCompare(a.issuedDate || ""))
  }, [documents, client])

  // Stats derived from docs
  const stats = useMemo(() => {
    const invoices = clientDocs.filter(d => d.type === "Invoice")
    const estimates = clientDocs.filter(d => d.type === "Estimate")
    const totalSpent = invoices.reduce((sum, d) => sum + (d.amount || 0), 0)
    const completedJobs = invoices.filter(d => d.status === "Paid" || d.status === "Partial").length
    const uniqueAddresses = [...new Set(clientDocs.map(d => d.clientAddress).filter(Boolean))]
    return { invoices: invoices.length, estimates: estimates.length, totalSpent, completedJobs, uniqueAddresses }
  }, [clientDocs])

  const startEdit = () => {
    if (!client) return
    setEditForm({ name: client.name, phone: client.phone || "", address: client.address || "", secondaryEmail: client.secondaryEmail || "" })
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const saveEdit = async () => {
    if (!client) return
    if (!editForm.name.trim()) {
      toast({ variant: "destructive", title: "Name is required." })
      return
    }
    await updateClient(client.email, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      secondaryEmail: editForm.secondaryEmail.trim() || undefined,
    })
    toast({ title: "Client updated", description: `${editForm.name} saved successfully.` })
    setIsEditing(false)
  }

  const openDoc = (doc: Document) => {
    const type = doc.type === "Invoice" ? "invoice" : "estimate"
    router.push(`/view/${type}/${doc.id}?internal=true`)
    onClose()
  }

  if (!client) return null

  const displayName = isEditing ? editForm.name : client.name

  return (
    <Sheet open={isOpen} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold truncate">{displayName}</SheetTitle>
              <SheetDescription className="text-sm">{client.email}</SheetDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit} className="shrink-0">
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" />Save</Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Edit Form */}
        {isEditing && (
          <div className="space-y-3 mb-4 p-3 bg-muted/40 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-secondary-email">Secondary Email</Label>
              <Input id="edit-secondary-email" type="email" value={editForm.secondaryEmail} onChange={e => setEditForm(f => ({ ...f, secondaryEmail: e.target.value }))} placeholder="Optional second email" />
            </div>
          </div>
        )}

        {/* Contact Info */}
        {!isEditing && (
          <div className="space-y-2 mb-4">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{client.address}</span>
              </div>
            )}
            {client.secondaryEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{client.secondaryEmail} (secondary)</span>
              </div>
            )}
          </div>
        )}

        <Separator className="mb-4" />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="border-0 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Total Billed</span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                ${stats.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Jobs Paid</span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.completedJobs}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Invoices</span>
              </div>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{stats.invoices}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Estimates</span>
              </div>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{stats.estimates}</p>
            </CardContent>
          </Card>
        </div>

        {/* Properties / Job Sites */}
        {stats.uniqueAddresses.length > 1 && (
          <>
            <div className="mb-3">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Properties / Job Sites
              </h3>
              <div className="space-y-1">
                {stats.uniqueAddresses.map((addr, i) => (
                  <div key={i} className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-1.5">
                    {addr}
                  </div>
                ))}
              </div>
            </div>
            <Separator className="mb-4" />
          </>
        )}

        {/* Documents List */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
            <FileText className="h-4 w-4" /> Documents ({clientDocs.length})
          </h3>
          {clientDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents found for this client.</p>
          ) : (
            <div className="space-y-2">
              {clientDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => openDoc(doc)}
                  className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {doc.type}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {doc.type === "Invoice" ? doc.invoiceNumber : doc.estimateNumber}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{doc.projectTitle}</p>
                      {doc.clientAddress && stats.uniqueAddresses.length > 1 && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 inline mr-0.5" />{doc.clientAddress}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-700"}`}>
                        {doc.status}
                      </span>
                      {doc.type === "Invoice" && (
                        <span className="text-sm font-semibold">
                          ${(doc.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground mt-0.5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1">{doc.issuedDate}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
