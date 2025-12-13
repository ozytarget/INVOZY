'use client';

import { CreateEstimateForm } from "@/components/estimates/create-estimate-form";

export default function CreateEstimatePage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Create Estimate</h1>
        <p className="text-muted-foreground text-sm">Fill out the form below to create a new estimate.</p>
       </div>
      <CreateEstimateForm />
    </div>
  )
}
