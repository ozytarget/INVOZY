
'use client'

import { useState } from "react"
import { useDocuments } from "@/hooks/use-documents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Pencil, X, Check, HardHat } from "lucide-react"
import type { Subcontractor } from "@/lib/types"

export function SubcontractorsList() {
  const { subcontractors, addSubcontractor, updateSubcontractor, deleteSubcontractor } = useDocuments();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', specialty: '' });

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', specialty: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    addSubcontractor({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty.trim(),
    });
    toast({ title: "Subcontractor added" });
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim()) return;
    updateSubcontractor(editingId, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty.trim(),
    });
    toast({ title: "Subcontractor updated" });
    resetForm();
  };

  const startEdit = (sub: Subcontractor) => {
    setEditingId(sub.id);
    setIsAdding(false);
    setForm({ name: sub.name, email: sub.email, phone: sub.phone, specialty: sub.specialty });
  };

  const handleDelete = (id: string) => {
    deleteSubcontractor(id);
    toast({ title: "Subcontractor removed" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline flex items-center gap-2">
              <HardHat className="h-5 w-5" />
              Subcontractors
            </CardTitle>
            <CardDescription>Manage your subcontractor contacts for work orders.</CardDescription>
          </div>
          {!isAdding && !editingId && (
            <Button size="sm" onClick={() => { setIsAdding(true); setForm({ name: '', email: '', phone: '', specialty: '' }); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isAdding || editingId) && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Specialty (e.g. Electrician)" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input placeholder="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={editingId ? handleUpdate : handleAdd}>
                <Check className="h-4 w-4 mr-1" /> {editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {subcontractors.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">No subcontractors yet. Add your first one above.</p>
        )}

        {subcontractors.map(sub => (
          <div key={sub.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{sub.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {[sub.specialty, sub.email, sub.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(sub)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(sub.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
