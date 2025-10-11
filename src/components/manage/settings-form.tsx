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
import { Globe, Calendar, Building, User, Mail, Phone, Image as ImageIcon, Hash } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

const settingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  taxId: z.string().optional(),
  contractorName: z.string().min(2, "Contractor name is required."),
  companyEmail: z.string().email("Invalid email address."),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyWebsite: z.string().optional(),
  schedulingUrl: z.string().optional(),
  companyLogo: z.string().optional(),
  userAvatar: z.string().optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function SettingsForm() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: "",
      taxId: "",
      contractorName: "",
      companyEmail: "",
      companyPhone: "",
      companyAddress: "",
      companyWebsite: "",
      schedulingUrl: "",
      companyLogo: "",
      userAvatar: "",
    },
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem("companySettings");
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            form.reset(parsedSettings);
            if (parsedSettings.companyLogo) {
                setLogoPreview(parsedSettings.companyLogo);
            }
            if (parsedSettings.userAvatar) {
                setAvatarPreview(parsedSettings.userAvatar);
            }
        }
    }
  }, [form]);

  async function onSubmit(data: SettingsFormValues) {
    try {
        localStorage.setItem("companySettings", JSON.stringify(data));
        toast({
        title: "Settings Saved",
        description: "Your information has been updated successfully.",
        });
        // This will force a re-render of components that depend on localStorage
        window.dispatchEvent(new Event("storage"));
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error Saving",
            description: "Could not save settings to your browser's local storage.",
        });
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'companyLogo' | 'userAvatar', setPreview: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                variant: "destructive",
                title: "File too large",
                description: "Please upload an image smaller than 2MB.",
            });
            return;
        }
        const dataUrl = await fileToDataUrl(file);
        form.setValue(fieldName, dataUrl, { shouldDirty: true });
        setPreview(dataUrl);
    }
  }
  
  // Add a listener to update nav when settings change in another tab
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSettings = localStorage.getItem('companySettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        form.reset(parsed);
         if (parsed.companyLogo) {
          setLogoPreview(parsed.companyLogo);
        }
        if (parsed.userAvatar) {
          setAvatarPreview(parsed.userAvatar);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [form]);


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
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID (e.g., EIN, RFC)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="XX-XXXXXXX" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                            <Input placeholder="acme.com" {...field} className="pl-10" />
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
                            <Input placeholder="calendly.com/acme" {...field} className="pl-10" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <FormField
                    control={form.control}
                    name="companyLogo"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Logo</FormLabel>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center bg-muted">
                            {logoPreview ? (
                              <Image src={logoPreview} alt="Company logo preview" width={80} height={80} className="object-contain rounded-md" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <FormControl>
                            <Input id="companyLogoInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'companyLogo', setLogoPreview)} className="file:text-primary file:font-medium" />
                          </FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="userAvatar"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>User Avatar</FormLabel>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-20 w-20">
                            {avatarPreview && <AvatarImage src={avatarPreview} alt="User avatar preview" />}
                            <AvatarFallback className="text-3xl">
                              <User />
                            </AvatarFallback>
                          </Avatar>
                          <FormControl>
                             <Input id="userAvatarInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'userAvatar', setAvatarPreview)} className="file:text-primary file:font-medium" />
                          </FormControl>
                        </div>
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

    