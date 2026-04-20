
'use server';

/**
 * @fileOverview AI-powered estimate suggestions flow.
 *
 * This flow provides suggestions for optimal pricing, refined descriptions, and potential upsells
 * based on project details provided in the input.
 *
 * @interface AIPoweredEstimateSuggestionsInput - Input for the AI-powered estimate suggestions flow.
 * @interface AIPoweredEstimateSuggestionsOutput - Output of the AI-powered estimate suggestions flow.
 * @function getAIPoweredEstimateSuggestions - The main function to trigger the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIPoweredEstimateSuggestionsInputSchema = z.object({
  projectDescription: z
    .string()
    .describe('Detailed description of the project, including scope, requirements, and any specific client requests.'),
  photoDataUri: z
    .string()
    .optional()
    .describe("A photo of the project area, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  location: z.string().describe('The city and state where the project is located, e.g., "Austin, TX". This is CRITICAL for accurate labor cost calculation.'),
});

export type AIPoweredEstimateSuggestionsInput = z.infer<typeof AIPoweredEstimateSuggestionsInputSchema>;

const LineItemSchema = z.object({
  description: z.string().describe("The specific material or labor task. E.g., '3/4 inch Plywood (4x8 sheet)' or 'Install new interior pre-hung door'."),
  quantity: z.number().describe("The number of units for this line item."),
  price: z.number().describe("The cost for a single unit of this item. For materials, this is the per-item price. For labor, this is the total price for the task."),
});

const AIPoweredEstimateSuggestionsOutputSchema = z.object({
  materialLineItems: z.array(LineItemSchema).describe("A detailed list of ONLY the required materials to complete the project."),
  laborLineItems: z.array(LineItemSchema).describe("A detailed list of ONLY the required labor tasks to complete the project."),
  notes: z.string().describe("A high-level summary note for the final client. This should NOT mention Home Depot, location benchmarks, pricing strategies, or internal calculations."),
});

export type AIPoweredEstimateSuggestionsOutput = z.infer<typeof AIPoweredEstimateSuggestionsOutputSchema>;

export async function getAIPoweredEstimateSuggestions(
  input: AIPoweredEstimateSuggestionsInput
): Promise<AIPoweredEstimateSuggestionsOutput> {
  const flowInput = { ...input, contractorLocation: input.location };
  return aiPoweredEstimateSuggestionsFlow(flowInput);
}

const aiPoweredEstimateSuggestionsPrompt = ai.definePrompt({
  name: 'aiPoweredEstimateSuggestionsPrompt',
  input: { schema: AIPoweredEstimateSuggestionsInputSchema.extend({ contractorLocation: z.string() }) },
  output: { schema: AIPoweredEstimateSuggestionsOutputSchema },
  prompt: `You are an **ELITE GENERAL CONTRACTOR AND MASTER ESTIMATOR**. Your software behavior must follow strict professional estimation logic and consultative selling.

Project Description: """{{{projectDescription}}}"""
Contractor's State for Labor Pricing: "{{{contractorLocation}}}"
{{#if photoDataUri}}
Project Photo:
{{media url=photoDataUri}}
{{/if}}

---

## ELITE CONTRACTOR PROTOCOL: STRICT COMPLIANCE

### ALGORITHM 1: VALIDATION AND CORRECTION (STANDARDIZATION)
Role: Ensure all dimensions are commercially viable.
Rule: If the user provides non-standard dimensions for commodity items (doors, windows, lumber, etc.), you MUST correct to the nearest standard commercially available size.

If correction is required:
- Use the corrected standard size in line items.
- Explain the correction briefly in the client-facing notes.
- Do not create line items for non-existent/custom-only sizes unless explicitly requested as custom work.

### ALGORITHM 2: VALUE DETECTION AND UPSELL (CONSULTATIVE SELLING)
Role: Include value-added options on every estimate.
Rule: You MUST include at least three relevant optional services for every viable project.

Because this schema does not include an optional services array, place these options inside the notes as a short numbered list under "Optional Services".

Mandatory logic check:
- If the project includes doors/windows/trim, optional services must include painting or finishing, hardware/lockset, and demolition/disposal.

### LABOR AND MATERIAL RULES
- Labor must include prep, cleanup, and all minor consumables.
- Materials must include only major billable materials.
- Do not list minor consumables (caulk, nails, tape, brushes) in materialLineItems.
- Labor pricing must be fixed per task (not hourly rate) based on market averages in "{{{contractorLocation}}}".

### UNITS AND NORMALIZATION
- Treat sf/sq ft/sqft/qf as square feet.
- Treat yd/yds as square yards when relevant (1 sq yd = 9 sq ft).
- If dimensions have no units:
  - assume inches for doors/windows,
  - assume feet for room/flooring scale.
- For ambiguous inputs, choose the most likely interpretation and state assumption in notes.

---

## OUTPUT RULES (STRICT)
1. Return valid JSON matching the schema exactly.
2. Populate materialLineItems with major materials only.
3. Populate laborLineItems with measurable fixed-cost tasks.
4. Keep notes client-facing, professional, and concise.
5. Never mention internal pricing source names or pricing strategy in notes.

Generate the estimate now in the required JSON format.
`,
});


const aiPoweredEstimateSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiPoweredEstimateSuggestionsFlow',
    inputSchema: AIPoweredEstimateSuggestionsInputSchema.extend({ contractorLocation: z.string() }),
    outputSchema: AIPoweredEstimateSuggestionsOutputSchema,
  },
  async input => {
    const { output } = await aiPoweredEstimateSuggestionsPrompt(input);
    return output!;
  }
);
