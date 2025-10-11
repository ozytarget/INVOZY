
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { CreateClientForm } from "./create-client-form"
import { useState } from "react"
import { Client } from "@/lib/types"

type CreateClientDialogProps = {
    onClientCreated: (newClient: Client) => void;
}

export function CreateClientDialog({ onClientCreated }: CreateClientDialogProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSuccess = (newClient: Client) => {
        onClientCreated(newClient);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create a New Client</DialogTitle>
                <DialogDescription>
                    Fill out the form below to add a new client. This client will be available for future estimates and invoices.
                </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <CreateClientForm onSuccess={handleSuccess} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

