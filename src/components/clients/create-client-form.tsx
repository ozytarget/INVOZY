'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useDocuments } from "@/hooks/use-documents"
import { Client } from "@/lib/types"

const formSchema = z.object({
  clientName: z.string().min(2, "Client name must be at least 2 characters."),
  clientEmail: z.string().email("Invalid email address."),
  clientAddress: z.string().min(3, "Client address is required."),
  clientPhone: z.string().optional(),
})

type ClientFormValues = z.infer<typeof formSchema>

type CreateClientFormProps = {
  onSuccess?: (newClient: Client) => void;
}


export function CreateClientForm({ onSuccess }: CreateClientFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { addClient } = useDocuments();
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      clientPhone: "",
    },
  })

  function onSubmit(data: ClientFormValues) {
    const newClientData: Omit<Client, 'totalBilled' | 'documentCount'> = {
      name: data.clientName,
      email: data.clientEmail,
      address: data.clientAddress,
      phone: data.clientPhone || "",
    }
    
    const newClientWithDefaults: Client = {
      ...newClientData,
      totalBilled: 0,
      documentCount: 0,
    }

    addClient(newClientData);
    
    toast({
      title: "Client Created",
      description: `${data.clientName} has been added to your client list.`,
    })

    if (onSuccess) {
      onSuccess(newClientWithDefaults);
    } else {
      router.push("/dashboard/clients");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Client Address</FormLabel>
                    <FormControl>
                    <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Client Phone</FormLabel>
                    <FormControl>
                    <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            </CardContent>
        </Card>
        
        <div className="flex justify-end gap-2">
            {!onSuccess && <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>}
            <Button type="submit">Save Client</Button>
        </div>
      </form>
    </Form>
  )
}
