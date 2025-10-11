import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";

export default function CreateInvoicePage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Create Invoice</h1>
        <p className="text-muted-foreground text-sm">Fill out the form below to create a new invoice.</p>
       </div>
      <CreateInvoiceForm />
    </div>
  )
}
