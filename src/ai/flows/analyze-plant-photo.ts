'use server';

/**
 * @fileOverview An AI agent that analyzes a photo of a cannabis plant to identify potential issues.
 *
 * - analyzePlantPhoto - A function that handles the plant photo analysis process.
 * - AnalyzePlantPhotoInput - The input type for the analyzePlantPhoto function.
 * - AnalyzePlantPhotoOutput - The return type for the analyzePlantPhoto function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzePlantPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a cannabis plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePlantPhotoInput = z.infer<typeof AnalyzePlantPhotoInputSchema>;

const AnalyzePlantPhotoOutputSchema = z.object({
  analysisResult: z
    .string()
    .describe('A brief description of potential issues identified in the plant photo.'),
});
export type AnalyzePlantPhotoOutput = z.infer<typeof AnalyzePlantPhotoOutputSchema>;

export async function analyzePlantPhoto(
  input: AnalyzePlantPhotoInput
): Promise<AnalyzePlantPhotoOutput> {
  return analyzePlantPhotoFlow(input);
}

const analyzePlantPhotoPrompt = ai.definePrompt({
  name: 'analyzePlantPhotoPrompt',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo of a cannabis plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
      analysisResult: z
        .string()
        .describe('A brief description of potential issues identified in the plant photo.'),
    }),
  },
  prompt: `You are an expert in cannabis plant health.

You will analyze the provided photo of a cannabis plant and provide a brief description of potential issues or observations. Focus on identifying any visual signs of diseases, nutrient deficiencies, or other problems.

Photo: {{media url=photoDataUri}}`,
});

const analyzePlantPhotoFlow = ai.defineFlow<
  typeof AnalyzePlantPhotoInputSchema,
  typeof AnalyzePlantPhotoOutputSchema
>(
  {
    name: 'analyzePlantPhotoFlow',
    inputSchema: AnalyzePlantPhotoInputSchema,
    outputSchema: AnalyzePlantPhotoOutputSchema,
  },
  async input => {
    const {output} = await analyzePlantPhotoPrompt(input);
    return output!;
  }
);
