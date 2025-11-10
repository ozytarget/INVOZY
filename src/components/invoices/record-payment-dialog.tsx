
'use client'

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Document, Payment, PaymentMethod } from "@/lib/types";

const paymentMethods: PaymentMethod[] = ["Cash", "Bank Transfer", "Credit Card", "Debit Card"];

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  method: z.enum(paymentMethods, {
    required_error: "You need to select a payment method.",
  }),
})

type PaymentFormValues = z.infer<typeof formSchema>

type RecordPaymentDialogProps = {
  document: Document;
  onRecordPayment: (payment: Omit<Payment, 'id' | 'date'>) => void;
  children: React.ReactNode;
}

export function RecordPaymentDialog({ document: documentData, onRecordPayment, children }: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const amountPaid = documentData.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  const balanceDue = documentData.amount - amountPaid;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: balanceDue,
      method: "Cash",
    },
  })

  function onSubmit(data: PaymentFormValues) {
    onRecordPayment(data);
    form.reset();
    setIsOpen(false);
  }

  const handleSetFullPayment = () => {
    form.setValue('amount', balanceDue);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment for INV-{documentData.id.split('-')[1]}</DialogTitle>
          <DialogDescription>
            Record a new payment for this invoice. The balance due is ${balanceDue.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={handleSetFullPayment}>Full</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      {paymentMethods.map(method => (
                        <FormItem key={method} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={method} />
                          </FormControl>
                          <FormLabel className="font-normal">{method}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancel
                    </Button>
                </DialogClose>
                <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
