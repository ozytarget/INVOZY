import { CreateClientForm } from "@/components/clients/create-client-form";

export default function CreateClientPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Create Client</h1>
        <p className="text-muted-foreground text-sm">Fill out the form below to add a new client.</p>
       </div>
      <CreateClientForm />
    </div>
  )
}
