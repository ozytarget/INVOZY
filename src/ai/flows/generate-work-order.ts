
'use server';

/**
 * @fileOverview AI-powered work order generation flow.
 * This flow takes the project details from an invoice and generates a price-free work order
 * for subcontractors, detailing tasks, materials, and required tools.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WorkOrderInputSchema = z.object({
  projectTitle: z.string().describe("The main title of the project."),
  projectDescription: z
    .string()
    .optional()
    .describe('The detailed description of the project from the invoice.'),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
  })).describe("A list of line items from the invoice, without prices."),
});

export type WorkOrderInput = z.infer<typeof WorkOrderInputSchema>;

const WorkOrderOutputSchema = z.object({
  tasks: z.array(z.string()).describe("A detailed, step-by-step list of tasks to be performed by the subcontractor."),
  materials: z.array(z.string()).describe("A comprehensive list of all materials needed to complete the job. Should not include quantities, just the material name."),
  tools: z.array(z.string()).describe("A list of all tools required to perform the tasks."),
});

export type WorkOrderOutput = z.infer<typeof WorkOrderOutputSchema>;

export async function generateWorkOrder(
  input: WorkOrderInput
): Promise<WorkOrderOutput> {
  return generateWorkOrderFlow(input);
}

const generateWorkOrderPrompt = ai.definePrompt({
  name: 'generateWorkOrderPrompt',
  input: {schema: WorkOrderInputSchema},
  output: {schema: WorkOrderOutputSchema},
  prompt: `You are an expert Project Manager for a general contracting company. Your task is to create a clear, detailed, and actionable Work Order for a subcontractor based on an internal invoice.

**CRITICAL INSTRUCTIONS:**
1.  **NO PRICES:** This work order is for the subcontractor's execution team. You MUST NOT include any pricing, costs, hours, or any financial information.
2.  **BE EXPLICIT AND DETAILED:** The subcontractor needs to know exactly what to do, what materials to use, and what tools to bring. Be exhaustive.
3.  **DERIVE FROM INPUT:** Base your output entirely on the provided project title, description, and line items. Infer the necessary steps, materials, and tools.

**Project Title:** "{{projectTitle}}"
**Project Description:** """{{{projectDescription}}}"""

**Invoice Line Items (for context, not for pricing):**
{{#each lineItems}}
- ({{quantity}}x) {{description}}
{{/each}}

Based on the information above, generate the Work Order in the required JSON format with three sections:
- **tasks:** A step-by-step checklist of actions to perform. Be very specific.
- **materials:** A list of all materials needed.
- **tools:** A list of all tools needed for the job.
`,
});


const generateWorkOrderFlow = ai.defineFlow(
  {
    name: 'generateWorkOrderFlow',
    inputSchema: WorkOrderInputSchema,
    outputSchema: WorkOrderOutputSchema,
  },
  async input => {
    const {output} = await generateWorkOrderPrompt(input);
    return output!;
  }
);
