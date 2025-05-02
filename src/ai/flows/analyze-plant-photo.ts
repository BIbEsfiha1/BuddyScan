'use server';

/**
 * @fileOverview Um agente de IA que analisa a foto de uma planta de cannabis para identificar problemas potenciais.
 *
 * - analyzePlantPhoto - Uma função que lida com o processo de análise de fotos de plantas.
 * - AnalyzePlantPhotoInput - O tipo de entrada para a função analyzePlantPhoto.
 * - AnalyzePlantPhotoOutput - O tipo de retorno para a função analyzePlantPhoto.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzePlantPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Uma foto de uma planta de cannabis, como um URI de dados que deve incluir um tipo MIME e usar codificação Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'." // Translated
    ),
});
export type AnalyzePlantPhotoInput = z.infer<typeof AnalyzePlantPhotoInputSchema>;

const AnalyzePlantPhotoOutputSchema = z.object({
  analysisResult: z
    .string()
    .describe('Uma breve descrição dos problemas potenciais identificados na foto da planta.'), // Translated
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
          "Uma foto de uma planta de cannabis, como um URI de dados que deve incluir um tipo MIME e usar codificação Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'." // Translated
        ),
    }),
  },
  output: {
    schema: z.object({
      analysisResult: z
        .string()
        .describe('Uma breve descrição dos problemas potenciais identificados na foto da planta.'), // Translated
    }),
  },
  prompt: `Você é um especialista em saúde de plantas de cannabis.

Você analisará a foto fornecida de uma planta de cannabis e fornecerá uma breve descrição de possíveis problemas ou observações. Concentre-se em identificar quaisquer sinais visuais de doenças, deficiências de nutrientes ou outros problemas.

Foto: {{media url=photoDataUri}}`, // Translated prompt content
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
