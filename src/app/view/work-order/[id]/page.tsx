

'use client';

import { notFound, useParams } from "next/navigation";
import type { Document, Subcontractor } from "@/lib/types";
import { ClipboardList, HardHat, Wrench, Loader2, User, Home, MessageSquare, Mail, Send, ChevronsUpDown, Check, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { sendWorkOrderEmail } from "@/app/actions";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocuments } from "@/hooks/use-documents";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

type WorkOrder = { tasks: string[]; materials: string[]; tools: string[] };

function WorkOrderDisplay({ workOrder, document: documentData }: { workOrder: WorkOrder, document: Document }) {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <HardHat className="w-6 h-6" />
                        Tasks to Perform
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc space-y-2 pl-5">
                        {workOrder.tasks.map((task, index) => (
                            <li key={index}>{task}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <ClipboardList className="w-6 h-6" />
                            Required Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc space-y-2 pl-5">
                            {workOrder.materials.map((material, index) => (
                                <li key={index}>{material}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <Wrench className="w-6 h-6" />
                            Necessary Tools
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc space-y-2 pl-5">
                            {workOrder.tools.map((tool, index) => (
                                <li key={index}>{tool}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SendToSubcontractorSection({ documentData, workOrder }: { documentData: Document, workOrder: WorkOrder | null }) {
  const { subcontractors, addSubcontractor } = useDocuments();
  const { toast } = useToast();
  const [selectedSub, setSelectedSub] = useState<Subcontractor | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', email: '', phone: '', specialty: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const buildMessageBody = () => {
    const parts = [
      `Work Order: ${documentData.projectTitle}`,
      `Client: ${documentData.clientName}`,
      `Address: ${documentData.clientAddress}`,
      '',
    ];
    if (workOrder) {
      parts.push('Tasks:');
      workOrder.tasks.forEach((t, i) => parts.push(`${i + 1}. ${t}`));
      parts.push('');
      parts.push('Materials: ' + workOrder.materials.join(', '));
      parts.push('Tools: ' + workOrder.tools.join(', '));
    }
    return parts.join('\n');
  };

  const handleSendSms = (sub: Subcontractor) => {
    if (!sub.phone) {
      toast({ variant: "destructive", title: "No phone number", description: `${sub.name} has no phone number on file.` });
      return;
    }
    const body = buildMessageBody();
    window.open(`sms:${sub.phone}?body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleSendEmail = async (sub: Subcontractor) => {
    if (!sub.email) {
      toast({ variant: "destructive", title: "No email", description: `${sub.name} has no email on file.` });
      return;
    }
    setIsSendingEmail(true);
    try {
      const result = await sendWorkOrderEmail({
        to: sub.email,
        subcontractorName: sub.name,
        projectTitle: documentData.projectTitle,
        clientName: documentData.clientName,
        clientAddress: documentData.clientAddress || '',
        tasks: workOrder?.tasks || [],
        materials: workOrder?.materials || [],
        tools: workOrder?.tools || [],
        companyName: documentData.companyName || 'Your Company',
        companyEmail: documentData.companyEmail,
      });
      if (result.success) {
        toast({ title: "Email sent", description: `Work order sent to ${sub.name} (${sub.email})` });
      } else {
        toast({ variant: "destructive", title: "Email failed", description: result.error || 'Could not send email.' });
      }
    } catch {
      toast({ variant: "destructive", title: "Email failed", description: 'Unexpected error sending email.' });
    }
    setIsSendingEmail(false);
  };

  const handleAddNew = () => {
    if (!newSub.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    addSubcontractor({
      name: newSub.name.trim(),
      email: newSub.email.trim(),
      phone: newSub.phone.trim(),
      specialty: newSub.specialty.trim(),
    });
    toast({ title: "Subcontractor saved" });
    setNewSub({ name: '', email: '', phone: '', specialty: '' });
    setIsAddingNew(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Send className="w-5 h-5" />
          Send to Subcontractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className={cn("flex-1 justify-between", !selectedSub && "text-muted-foreground")}>
                {selectedSub ? `${selectedSub.name}${selectedSub.specialty ? ` (${selectedSub.specialty})` : ''}` : "Select subcontractor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search subcontractor..." />
                <CommandList>
                  <CommandEmpty>No subcontractor found.</CommandEmpty>
                  <CommandGroup>
                    {subcontractors.map(sub => (
                      <CommandItem
                        key={sub.id}
                        value={sub.name}
                        onSelect={() => {
                          setSelectedSub(sub);
                          setPopoverOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedSub?.id === sub.id ? "opacity-100" : "opacity-0")} />
                        <div>
                          <span className="font-medium">{sub.name}</span>
                          {sub.specialty && <span className="text-muted-foreground ml-1">· {sub.specialty}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setIsAddingNew(!isAddingNew)}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        {isAddingNew && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Name *" value={newSub.name} onChange={e => setNewSub(s => ({ ...s, name: e.target.value }))} />
              <Input placeholder="Specialty" value={newSub.specialty} onChange={e => setNewSub(s => ({ ...s, specialty: e.target.value }))} />
              <Input placeholder="Email" type="email" value={newSub.email} onChange={e => setNewSub(s => ({ ...s, email: e.target.value }))} />
              <Input placeholder="Phone" type="tel" value={newSub.phone} onChange={e => setNewSub(s => ({ ...s, phone: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddNew}><Check className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        )}

        {selectedSub && (
          <>
            <Separator />
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <p className="font-medium">{selectedSub.name}</p>
              <p className="text-sm text-muted-foreground">
                {[selectedSub.specialty, selectedSub.email, selectedSub.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1" onClick={() => handleSendSms(selectedSub)} disabled={!selectedSub.phone}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send via SMS
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => handleSendEmail(selectedSub)} disabled={!selectedSub.email || isSendingEmail}>
                {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isSendingEmail ? 'Sending...' : 'Send via Email'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkOrderPage() {
  return <WorkOrderPageContent />;
}

function WorkOrderPageContent() {
  const params = useParams();
  const { toast } = useToast();
  const { documents, isLoading: docsLoading } = useDocuments();
  const id = typeof params.id === 'string' ? params.id : '';

  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || docsLoading) return;

    const doc = documents.find((d) => d.id === id && d.type === 'Invoice') || null;
    if (doc) {
      setDocumentData(doc);
      // Use pre-generated AI work order if available, otherwise basic fallback
      if (doc.workOrder && doc.workOrder.tasks.length > 0) {
        setWorkOrder({
          tasks: doc.workOrder.tasks,
          materials: doc.workOrder.materials,
          tools: doc.workOrder.tools,
        });
      } else {
        const tasks = doc.lineItems.map((item, i) => `${i + 1}. ${item.description} (Qty: ${item.quantity})`);
        const materials = doc.lineItems.map(item => item.description);
        setWorkOrder({
          tasks: tasks.length > 0 ? tasks : ['Review project scope on site', 'Complete work as discussed'],
          materials: materials.length > 0 ? materials : ['As specified in invoice'],
          tools: ['Standard tools for the job scope'],
        });
      }
    }
    setIsLoading(false);
  }, [id, documents, docsLoading]);

  if (isLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!documentData) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen pb-32">
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="sticky top-4 z-20 mb-4 flex justify-end gap-2">
                <Button asChild variant="outline" className="bg-background/80 backdrop-blur-sm">
                    <Link href={`/view/invoice/${id}?internal=true`}>
                        <Home className="mr-2" />
                        Back to Invoice
                    </Link>
                </Button>
            </div>
             <Card className="p-8 shadow-lg">
                <CardHeader className="p-0 mb-8">
                     <header className="flex justify-between items-start mb-8">
                        <div>
                            {documentData.companyLogo && (
                                <Image src={documentData.companyLogo} alt={documentData.companyName || 'Company Logo'} width={120} height={50} className="object-contain mb-2" />
                            )}
                            <div className="text-muted-foreground">
                                <p className="font-bold text-foreground">{documentData.companyName || "Your Company"}</p>
                                <p className="whitespace-pre-line">{documentData.companyAddress || "123 Contractor Lane\nBuildsville, ST 12345"}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-bold font-headline uppercase">Work Order</h1>
                            <p className="text-muted-foreground">Reference Invoice: {documentData.invoiceNumber}</p>
                        </div>
                    </header>
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <h2 className="font-semibold text-lg mb-2">{documentData.projectTitle}</h2>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                             <div className="flex items-start gap-3">
                                <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">{documentData.clientName}</p>
                                    <p className="text-muted-foreground">{documentData.clientEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Home className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground whitespace-pre-line">{documentData.clientAddress}</p>
                                    <p className="text-muted-foreground">{documentData.clientPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {workOrder && <WorkOrderDisplay workOrder={workOrder} document={documentData} />}
                </CardContent>
             </Card>

             {workOrder && (
               <div className="mt-8">
                 <SendToSubcontractorSection documentData={documentData} workOrder={workOrder} />
               </div>
             )}
        </div>
    </div>
  );
}
