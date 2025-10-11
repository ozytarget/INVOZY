'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Trash2, PlusCircle, User } from "lucide-react"
import { useEffect, useState } from "react"

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

export function CreateEstimateForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { addDocument, documents, clients } = useDocuments();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
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

  // Set default date on client-side to avoid hydration errors
  useEffect(() => {
    if (!form.getValues('issuedDate')) {
        form.setValue('issuedDate', new Date());
    }
  }, [form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  })
  
  const lineItems = form.watch("lineItems");
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  
  const projectDetailsForAI = `Project Title: ${form.watch('projectTitle')}\nProject Description: ${form.watch('projectDescription')}\nLine Items:\n${lineItems.map(item => `- ${item.description} (Qty: ${item.quantity}, Price: $${item.price})`).join('\n')}`;

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.email === clientId); // Using email as a unique ID for now
    setSelectedClient(client || null);
    form.setValue('clientId', clientId);
  }

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

  const handleApplySuggestions = (suggestions: { refinedDescription?: string }) => {
    if (suggestions.refinedDescription) {
        form.setValue('projectDescription', suggestions.refinedDescription);
        toast({
            title: "Description Updated",
            description: "The project description has been updated with the AI suggestion.",
        })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-headline">Client Information</CardTitle>
                    <Button variant="outline" size="sm" type="button" onClick={() => router.push('/dashboard/clients/create')}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Client
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Client</FormLabel>
                      <Select onValueChange={handleClientChange} defaultValue={field.value}>
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
                <div className="flex items-center justify-between">
                    <CardTitle className="font-headline">Project Scope & Line Items</CardTitle>
                    <AiSuggestionsDialog 
                        projectDetails={projectDetailsForAI} 
                        currentPricing={subtotal.toFixed(2)}
                        onApplySuggestions={handleApplySuggestions}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="projectDescription"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project Description</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Describe the project scope, deliverables, and timeline."
                                className="resize-y min-h-[100px]"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
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
                            ${(lineItems[index].quantity * lineItems[index].price).toFixed(2)}
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
