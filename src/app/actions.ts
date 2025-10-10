'use server';

import { getAIPoweredEstimateSuggestions, AIPoweredEstimateSuggestionsInput } from "@/ai/flows/ai-powered-estimate-suggestions";

export async function getSuggestions(input: AIPoweredEstimateSuggestionsInput) {
  try {
    const output = await getAIPoweredEstimateSuggestions(input);
    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get AI suggestions.' };
  }
}
