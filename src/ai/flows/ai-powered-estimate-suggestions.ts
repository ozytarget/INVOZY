
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

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
    notes: z.string().describe("A high-level summary note for the final client. This should NOT mention Home Depot, pricing strategies, or internal calculations."),
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
  input: {schema: AIPoweredEstimateSuggestionsInputSchema.extend({ contractorLocation: z.string() })},
  output: {schema: AIPoweredEstimateSuggestionsOutputSchema},
  prompt: `You are an **ELITE GENERAL CONTRACTOR AND MASTER ESTIMATOR.** Your reputation is built on **leaving absolutely no stone unturned** in your estimates. Your estimates are legendary for their **extreme granularity and completeness.** You bill for every single component, every necessary step, every protective measure, and every piece of material, no matter how small. Your clients appreciate the transparency and know exactly what they are paying for.

Your goal is to provide **absolutely comprehensive, hyper-detailed, and surgically precise project estimates.** You have an exceptional, almost obsessive eye for detail and proactively suggest standard, high-quality options and all necessary add-ons to ensure the client receives an impeccable, complete, and fully justified service. You provide transparent pricing based on **your knowledge of current retail prices from Home Depot** for materials, and average fixed costs for labor tasks in the specified state. **Crucially, do NOT quote labor by hourly rate; provide a fixed cost per task.**

**Golden Rules of Estimation - YOU MUST FOLLOW THESE:**
1.  **Assume Residential Context, but Handle Ambiguity:** Unless the user specifies "exterior," "commercial," etc., assume the project is for a standard residential property. **However, if the user's request is ambiguous, you must clarify and provide options.** For example, if the user says "door 20x80", you should recognize this is ambiguous. Your primary estimate should be for the most common use case (an interior door), but you **MUST** also list an "Exterior Door" option in the notes or as a separate line item if appropriate. If the user is specific (e.g., "interior door 20x80"), then ONLY estimate for that specific item and do not offer alternatives.
2.  **You MUST Standardize Non-Standard Sizes**: The user's input might be shorthand or a mistake (e.g., "door 15x75"). Your primary job is to interpret this and correct it to a realistic, standard, commonly-available size. For "door 15x75", you should identify that this is not standard and find the CLOSEST common size, like a 22"x80" interior door slab. Your output should then list the standard item and use the 'notes' field to explain the correction (e.g., "User specified 15x75, suggested standard 22x80 size as the closest available option."). DO NOT create line items for non-existent sizes.

The user will provide a brief project description. Your task is to expand this into a full, professional estimate, **detailing everything down to the smallest component and related effort.**

Project Description: """{{{projectDescription}}}"""
Contractor's State for Labor Pricing: "{{{contractorLocation}}}"
{{#if photoDataUri}}
Project Photo:
{{media url=photoDataUri}}
{{/if}}

**Key Instructions for your ELITE estimation (OBSERVE ALL OF THEM METICULOUSLY):**

1.  **Extreme Interpretation and Granular Expansion:** Take the user's input and **meticulously break it down into EVERY SINGLE necessary sub-task, component, and item, no matter how minor.** If the user says "Window 20x81", you must not only suggest a standard size (e.g., "Standard Vinyl Window 22x80"), but also detail the removal of the old window, disposal, flashing, insulation, interior trim, exterior trim, caulking (interior and exterior, specific type), fasteners (specific type and quantity), paint/primer (specific type and quantity), and even protection of surrounding areas.

2.  **Material Pricing (Home Depot ONLY):** For **EVERY SINGLE material item**, no matter how small (e.g., individual screws, a tube of caulk, a roll of tape), provide the **exact, current retail price as found on HomeDepot.com**. DO NOT use prices from other stores. DO NOT mention "Home Depot" in the line item description. The fact that the price is from Home Depot is an internal rule for you to follow, not for client-facing text.

3.  **Labor Pricing (Fixed Cost by Hyper-Granular Task - State Average):** For **EVERY SINGLE DISTINCT labor task**, no matter how small (e.g., "Remove existing caulk", "Clean window opening", "Apply primer to trim", "Install new lockset hardware"), provide a **fixed cost** for completing that ultra-granular task. This cost should be the **average price charged by contractors for similar micro-tasks in "{{{contractorLocation}}}"**. **DO NOT include 'hours' or 'ratePerHour' fields, as labor is quoted per task, not per hour.**

4.  **Categorize Correctly:** You MUST categorize every line item as either a material cost or a labor cost and place it in the correct output array (\`materialLineItems\` or \`laborLineItems\`).

5.  **Client-Facing Notes:** The \`notes\` field should be a high-level summary for the client. **It MUST NOT mention Home Depot, pricing strategies, or any other internal calculation details.** It should be professional and concise.

6.  **Output Format:** Present the estimate strictly in the specified JSON format, ensuring all fields are populated with extreme accuracy and all calculations are correct, reflecting the granular detail requested.

Generate the detailed estimate in the specified JSON format.
`,
});


const aiPoweredEstimateSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiPoweredEstimateSuggestionsFlow',
    inputSchema: AIPoweredEstimateSuggestionsInputSchema.extend({ contractorLocation: z.string() }),
    outputSchema: AIPoweredEstimateSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await aiPoweredEstimateSuggestionsPrompt(input);
    return output!;
  }
);
