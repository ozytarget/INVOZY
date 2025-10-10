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
  projectDetails: z
    .string()
    .describe('Detailed description of the project, including scope, requirements, and any specific client requests.'),
  currentPricing: z
    .string()
    .optional()
    .describe('The current pricing for the project, if any.'),
  pastProjects: z
    .string()
    .optional()
    .describe('Details of past projects, including pricing and client feedback.'),
});

export type AIPoweredEstimateSuggestionsInput = z.infer<typeof AIPoweredEstimateSuggestionsInputSchema>;

const AIPoweredEstimateSuggestionsOutputSchema = z.object({
  suggestedPricing: z
    .string()
    .describe('AI-suggested optimal pricing for the project, considering all project details.'),
  refinedDescription: z
    .string()
    .describe('AI-refined description of the project to highlight key benefits and value.'),
  potentialUpsells: z
    .string()
    .describe('AI-identified potential upsells based on project details and client needs.'),
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
  prompt: `You are an AI assistant that helps contractors create competitive and comprehensive estimates.

  Based on the project details, current pricing (if any), and past projects, provide the following:

  1.  Suggested Pricing: Provide an optimal pricing suggestion for the project.
  2.  Refined Description: Refine the project description to highlight key benefits and value.
  3.  Potential Upsells: Identify potential upsells that could benefit the client.

  Project Details: {{{projectDetails}}}
  Current Pricing: {{{currentPricing}}}
  Past Projects: {{{pastProjects}}}

  Ensure that the suggested pricing is competitive and justified, the refined description is clear and persuasive, and the potential upsells are relevant to the project.

  Format your answer as a JSON object.`,
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
