'use server';

/**
 * @fileOverview A flow for analyzing keyword trends using AI.
 *
 * - analyzeKeywordTrends - A function that triggers the keyword trend analysis.
 * - AnalyzeKeywordTrendsInput - The input type for the analyzeKeywordTrends function.
 * - AnalyzeKeywordTrendsOutput - The return type for the analyzeKeywordTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeKeywordTrendsInputSchema = z.object({
  serpData: z
    .string()
    .describe(
      'SERP data in JSON format for the tracked keywords, website, and location.'
    ),
});
export type AnalyzeKeywordTrendsInput = z.infer<
  typeof AnalyzeKeywordTrendsInputSchema
>;

const AnalyzeKeywordTrendsOutputSchema = z.object({
  insights: z
    .string()
    .describe(
      'AI-powered insights and trend analysis on the provided SERP data.'
    ),
});
export type AnalyzeKeywordTrendsOutput = z.infer<
  typeof AnalyzeKeywordTrendsOutputSchema
>;

export async function analyzeKeywordTrends(
  input: AnalyzeKeywordTrendsInput
): Promise<AnalyzeKeywordTrendsOutput> {
  return analyzeKeywordTrendsFlow(input);
}

const analyzeKeywordTrendsPrompt = ai.definePrompt({
  name: 'analyzeKeywordTrendsPrompt',
  input: {schema: AnalyzeKeywordTrendsInputSchema},
  output: {schema: AnalyzeKeywordTrendsOutputSchema},
  prompt: `You are an AI-powered SEO analyst. Analyze the following SERP data and provide insights on keyword performance trends, identifying potential opportunities and threats.

SERP Data: {{{serpData}}}`,
});

const analyzeKeywordTrendsFlow = ai.defineFlow(
  {
    name: 'analyzeKeywordTrendsFlow',
    inputSchema: AnalyzeKeywordTrendsInputSchema,
    outputSchema: AnalyzeKeywordTrendsOutputSchema,
  },
  async input => {
    const {output} = await analyzeKeywordTrendsPrompt(input);
    return output!;
  }
);
