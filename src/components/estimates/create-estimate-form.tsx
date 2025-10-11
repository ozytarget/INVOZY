'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Trash2 } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { AiSuggestionsDialog } from "./ai-suggestions-dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useDocuments } from "@/hooks/use-documents"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Client } from "@/lib/types"
import { CreateClientDialog } from "../clients/create-client-dialog"

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0, "Quantity must be positive."),
  price: z.coerce.number().min(0, "Price must be positive."),
})

const formSchema = z.object({
  clientId: z.string().min(1, "Please select a client."),
  projectTitle: z.string().min(3, "Project title is required."),
  projectDescription: z.string().optional(),
  issuedDate: z.date({
    required_error: "Issued date is required.",
  }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
  terms: z.string().optional(),
})

type EstimateFormValues = z.infer<typeof formSchema>

type CompanySettings = {
    companyAddress?: string;
};

export function CreateEstimateForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { addDocument, documents, clients } = useDocuments();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [companyLocation, setCompanyLocation] = useState('');
  
  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      projectTitle: "",
      projectDescription: "",
      lineItems: [{ description: "", quantity: 1, price: 0 }],
      notes: "",
      terms: "",
    },
  })

  useEffect(() => {
    // Set default dates only on the client side to avoid hydration errors
    form.setValue('issuedDate', new Date());

    if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem("companySettings");
        if (savedSettings) {
            const parsedSettings: CompanySettings = JSON.parse(savedSettings);
            setCompanyLocation(parsedSettings.companyAddress || '');
        }
    }
  }, [form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  })
  
  const lineItems = form.watch("lineItems");
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  
  const handleClientChange = useCallback((clientId: string) => {
    const client = clients.find(c => c.email === clientId);
    setSelectedClient(client || null);
    form.setValue('clientId', clientId);
  }, [clients, form]);

  function onSubmit(data: EstimateFormValues) {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Client not selected",
        description: "Please select a client before saving.",
      });
      return;
    }

    const nextId = `EST-${(documents.filter(d => d.type === 'Estimate').length + 1).toString().padStart(3, '0')}`;
    const newEstimate = {
      id: nextId,
      type: 'Estimate' as const,
      status: 'Draft' as const,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientAddress: selectedClient.address,
      clientPhone: selectedClient.phone || '',
      projectTitle: data.projectTitle,
      issuedDate: format(data.issuedDate, "yyyy-MM-dd"),
      amount: subtotal,
      lineItems: data.lineItems.map((item, index) => ({ ...item, id: `${index + 1}` })),
      notes: data.notes || '',
      terms: data.terms || '',
    }

    addDocument(newEstimate);
    
    toast({
      title: "Estimate Created",
      description: `Estimate for ${selectedClient.name} has been saved as a draft.`,
    })
    router.push("/dashboard/estimates");
  }

  const handleApplyLineItems = useCallback((items: { description: string; quantity: number; price: number }[]) => {
    // Remove the initial empty item if it exists
    if (fields.length === 1 && fields[0].description === "" && fields[0].price === 0) {
      remove(0);
    }
    append(items);
  }, [append, fields, remove]);

  const handleApplyNotes = useCallback((notes: string) => {
    form.setValue('notes', notes);
  }, [form]);


  const handleClientCreated = (newClient: Client) => {
    handleClientChange(newClient.email);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-headline">Client Information</CardTitle>
                    <CreateClientDialog onClientCreated={handleClientCreated} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Client</FormLabel>
                      <Select onValueChange={handleClientChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an existing client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.email} value={client.email}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedClient && (
                  <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50 space-y-1">
                      <p className="font-bold text-foreground">{selectedClient.name}</p>
                      <p>{selectedClient.address}</p>
                      <p>{selectedClient.email}</p>
                      <p>{selectedClient.phone}</p>
                  </div>
                )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="font-headline">Estimate Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="projectTitle"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                        <Input placeholder="New Website Redesign" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="issuedDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Issued Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Project Scope & Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormField
                      control={form.control}
                      name="projectDescription"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Project Description</FormLabel>
                          <FormControl>
                              <Textarea
                                  placeholder="Describe the project scope, deliverables, and timeline in detail. The more info you provide, the better the AI estimate will be."
                                  className="resize-y min-h-[100px]"
                                  {...field}
                              />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <div className="flex justify-end">
                    <AiSuggestionsDialog 
                        projectDescription={form.watch('projectDescription')} 
                        projectLocation={companyLocation}
                        onApplyLineItems={handleApplyLineItems}
                        onApplyNotes={handleApplyNotes}
                    />
                  </div>
                </div>
                
                <div className="border rounded-md">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%]">Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {fields.map((field, index) => (
                        <TableRow key={field.id}>
                        <TableCell>
                            <FormField
                            control={form.control}
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Input placeholder="e.g., UI/UX Design" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell>
                            <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Input type="number" placeholder="1" {...field} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                         <TableCell>
                            <FormField
                            control={form.control}
                            name={`lineItems.${index}.price`}
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Input type="number" placeholder="1200" {...field} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            ${(lineItems[index]?.quantity * lineItems[index]?.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">${subtotal.toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ description: "", quantity: 1, price: 0 })}
                >
                    Add Line Item
                </Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle className="font-headline">Notes & Terms</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Any additional notes for the client..."
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Terms</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="e.g., Net 30, 50% upfront"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">Save as Draft</Button>
        </div>
      </form>
    </Form>
  )
}
