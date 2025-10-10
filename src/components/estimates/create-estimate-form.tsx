'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Trash2 } from "lucide-react"

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

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0, "Quantity must be positive."),
  price: z.coerce.number().min(0, "Price must be positive."),
})

const formSchema = z.object({
  clientName: z.string().min(2, "Client name must be at least 2 characters."),
  clientEmail: z.string().email("Invalid email address."),
  projectTitle: z.string().min(3, "Project title is required."),
  projectDescription: z.string().optional(),
  issuedDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
})

type EstimateFormValues = z.infer<typeof formSchema>

export function CreateEstimateForm() {
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      projectTitle: "",
      projectDescription: "",
      issuedDate: new Date(),
      lineItems: [{ description: "", quantity: 1, price: 0 }],
      notes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  })
  
  const lineItems = form.watch("lineItems");
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  
  const projectDetailsForAI = `Project Title: ${form.watch('projectTitle')}\nProject Description: ${form.watch('projectDescription')}\nLine Items:\n${lineItems.map(item => `- ${item.description} (Qty: ${item.quantity}, Price: $${item.price})`).join('\n')}`;


  function onSubmit(data: EstimateFormValues) {
    toast({
      title: "Estimate Created",
      description: `Estimate for ${data.clientName} has been saved as a draft.`,
    })
    console.log(data)
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
                <CardHeader><CardTitle className="font-headline">Client Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Client Email</FormLabel>
                        <FormControl>
                        <Input placeholder="contact@acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
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
            <CardHeader><CardTitle className="font-headline">Notes</CardTitle></CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
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
