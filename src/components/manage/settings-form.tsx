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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Globe, Calendar, Building, User, Mail, Phone, Image as ImageIcon } from "lucide-react"

const settingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  contractorName: z.string().min(2, "Contractor name is required."),
  companyEmail: z.string().email("Invalid email address."),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyWebsite: z.string().url("Invalid URL.").optional().or(z.literal("")),
  schedulingUrl: z.string().url("Invalid URL.").optional().or(z.literal("")),
  companyLogoUrl: z.string().url("Invalid URL.").optional().or(z.literal("")),
  userAvatarUrl: z.string().url("Invalid URL.").optional().or(z.literal("")),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { toast } = useToast();
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    // TODO: Load saved settings here
    defaultValues: {
      companyName: "",
      contractorName: "",
      companyEmail: "",
      companyPhone: "",
      companyAddress: "",
      companyWebsite: "",
      schedulingUrl: "",
      companyLogoUrl: "",
      userAvatarUrl: "",
    },
  })

  function onSubmit(data: SettingsFormValues) {
    // TODO: Save settings to a database
    console.log(data)
    toast({
      title: "Settings Saved",
      description: "Your information has been updated successfully.",
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Company Information</CardTitle>
            <CardDescription>This information will appear on your estimates and invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., Acme Contracting" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name (Contractor)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., John Doe" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                        <Textarea placeholder="123 Main St, Anytown, USA 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" placeholder="contact@acme.com" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                     <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="(123) 456-7890" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="companyWebsite"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://acme.com" {...field} className="pl-10" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="schedulingUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Scheduling URL</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://calendly.com/acme" {...field} className="pl-10" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="companyLogoUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Logo URL</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://your-site.com/logo.png" {...field} className="pl-10" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="userAvatarUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>User Avatar URL</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://your-site.com/avatar.png" {...field} className="pl-10" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </Form>
  )
}
