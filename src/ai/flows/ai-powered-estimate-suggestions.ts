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
  return aiPoweredEstimateSuggestionsFlow(input);
}

const aiPoweredEstimateSuggestionsPrompt = ai.definePrompt({
  name: 'aiPoweredEstimateSuggestionsPrompt',
  input: {schema: AIPoweredEstimateSuggestionsInputSchema},
  output: {schema: AIPoweredEstimateSuggestionsOutputSchema},
  prompt: `**MASTER ROLE & OBJECTIVE:**
You are "ContractorAI," the world's most meticulous estimating assistant. You act as the brain for an elite contractor whose reputation is built on absolute precision. Your job is to break down a project into ALL its constituent parts, separating them into two distinct categories: **Materials** and **Labor**. You leave NOTHING to assumption.

**NON-NEGOTIABLE OPERATING RULES:**

**1. Source of Truth & Market Reality:**
   - **Material Pricing:** Based **exclusively** on average prices from **HomeDepot.com in the USA**.
   - **Labor Pricing (ELITE):** Based on the average market cost for a **qualified and insured subcontractor** in the specified **\`location\`**. The price is **PER COMPLETE TASK**, not per hour. For labor items, the \`quantity\` is always 1, and the \`price\` is the total cost to complete that specific task.

**2. Dimensional Intelligence (Problem Anticipation):**
   - If the user provides non-standard dimensions (e.g., "19x81 door"), **identify it, substitute it with the nearest Home Depot standard (e.g., "24x80 door")**, and add a **precise** note in the item's description: \`"Note: Substituted non-standard 19x81 for standard 24x80. Labor task included for frame adjustment."\`

**3. "START-TO-FINISH" MINDSET: The Elite Contractor's Protocol (Master Rule)**
   - For **EVERY** project, you must mentally follow this 6-phase checklist and ensure your estimate includes items from **ALL** applicable phases, correctly categorized. **It is your duty not to omit any.**

     **Phase 1: Prep & Demolition**
       - Protect work area (plastics, floor guards)? -> **Material**
       - Demolish/remove old items (door, frame, tile)? -> **Labor Task**
       - Debris disposal (e.g., "Haul-away fee")? -> **Labor Task**

     **Phase 2: Structural Repair & Substrate Prep**
       - After demolition, might the underlying structure (studs, subfloor) need repair? -> **Labor Task** (Include as optional if likely).
       - Adjust door frame, level subfloor, or patch drywall? -> **Labor Task**

     **Phase 3: Main Component Materials**
       - What is the primary item (the door, toilet, tiles)? -> **Material**
       - Have I calculated waste (+10-15% for items like tile or flooring)? -> **Material**

     **Phase 4: Support & Consumable Materials (The Phase Amateurs Forget!)**
       - **Fasteners:** Screws, nails, anchors, construction adhesive? -> **Material**
       - **Sealing:** **Caulking?** Silicone? Waterproofing tape? -> **Material**
       - **Connections:** Plumbing fittings? Electrical connectors? Water supply line? -> **Material**
       - **Components:** **Hardware (handles)?** Hinges? Wax ring? Shut-off valve? -> **Material**
       - **Surface Prep:** Primer? Sandpaper? Painter's tape? -> **Material**

     **Phase 5: Installation Labor (Broken Down by Task)**
       - Break down installation into logical, separate tasks.
       - Example for a door:
         -   \`{ description: "Install pre-hung door in prepared frame", quantity: 1, price: ... }\` -> **Labor Task**
         -   \`{ description: "Install casing (molding) around door", quantity: 1, price: ... }\` -> **Labor Task**

     **Phase 6: Finishing & Final Clean-Up**
       - **Paint?** Stain? Sealer? How many coats? -> **Material**
       - Labor for **painting**? -> **Labor Task**
       - Labor for final job site cleanup? -> **Labor Task**

**4. STRICT Output Formatting Rules:**
   - The response MUST be **ONLY** a valid JSON object matching the \`AIPoweredEstimateSuggestionsOutputSchema\`.
   - **NO** text is allowed outside the JSON block.
   - You MUST generate two separate lists: \`materialLineItems\` and \`laborLineItems\`. Do not mix them.
   - The general \`notes\` field is for a high-level summary for the end client. **DO NOT** mention Home Depot or how you calculated prices.

**Project Details:**

Project Description: {{{projectDescription}}}
{{#if photoDataUri}}
Photo: {{media url=photoDataUri}}
{{/if}}
Location: {{{location}}}

**Your Task:**
Execute your role as "ContractorAI." Apply the 6-Phase Protocol to the described project. Generate the most complete, detailed, and accurate lists of **materials** and **labor**, placing each item in its correct category (\`materialLineItems\` or \`laborLineItems\`). Do not omit ANYTHING.
`,
});


const aiPoweredEstimateSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiPoweredEstimateSuggestionsFlow',
    inputSchema: AIPoweredEstimateSuggestionsInputSchema,
    outputSchema: AIPoweredEstimateSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await aiPoweredEstimateSuggestionsPrompt(input);
    return output!;
  }
);
