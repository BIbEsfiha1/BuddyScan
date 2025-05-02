
'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Upload, Leaf, Bot, Loader2, AlertCircle, ImagePlus, RefreshCw } from 'lucide-react'; // Added RefreshCw
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
// Import the function to add entries to localStorage
import { addDiaryEntryToLocalStorage } from '@/types/diary-entry';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label'; // Import Label explicitly
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const diaryEntrySchema = z.object({
  note: z.string().min(1, 'A nota não pode estar vazia').max(1000, 'Nota muito longa (máx 1000 caracteres)'), // Increased max length
  stage: z.string().optional(), // Exemplo: Vegetativo, Floração
  // Use preprocess to handle empty string for number inputs
  heightCm: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Altura deve ser um número' }).positive("Altura deve ser positiva").optional().nullable() // Allow null after preprocess, added invalid_type_error
  ),
  ec: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
       z.number({ invalid_type_error: 'EC deve ser um número' }).positive("EC deve ser positivo").optional().nullable() // Allow null
  ),
  ph: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
        z.number({ invalid_type_error: 'pH deve ser um número' }).min(0).max(14, "pH deve estar entre 0 e 14").optional().nullable() // Allow null
  ),
  temp: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
         z.number({ invalid_type_error: 'Temperatura deve ser um número' }).optional().nullable() // Allow null
   ),
  humidity: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
          z.number({ invalid_type_error: 'Umidade deve ser um número' }).min(0, "Umidade não pode ser negativa").max(100, "Umidade não pode ser maior que 100").optional().nullable() // Allow null
   ),
  // Photo data is handled separately via state (photoPreview, photoFile)
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void; // Callback to notify parent about the new entry
}

export function DiaryEntryForm({ plantId, onNewEntry }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Keep photoFile state if needed for future real upload, but it won't be saved directly now
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Remove uploadProgress as we are not simulating upload anymore
  // const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast(); // Initialize toast

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DiaryEntryFormData>({
    resolver: zodResolver(diaryEntrySchema),
    defaultValues: {
      note: '',
      stage: undefined,
      heightCm: undefined,
      ec: undefined,
      ph: undefined,
      temp: undefined,
      humidity: undefined,
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation
      if (!file.type.startsWith('image/')) {
           toast({
                variant: "destructive",
                title: "Tipo de Arquivo Inválido",
                description: "Por favor, selecione um arquivo de imagem (JPEG, PNG, GIF, etc.).",
           });
           setAnalysisError('Por favor, selecione um arquivo de imagem válido.');
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
      }
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                variant: "destructive",
                title: "Arquivo Muito Grande",
                description: `O arquivo excede o limite de 5MB (${(file.size / (1024*1024)).toFixed(2)}MB).`,
            });
            setAnalysisError('A imagem é muito grande. O limite é 5MB.');
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
       }

      setPhotoFile(file); // Keep the file if needed later
       setAnalysisError(null);
       setAnalysisResult(null);
       setPhotoPreview(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string); // Store Data URI for preview and analysis
      };
      reader.onerror = () => {
        console.error("Erro ao ler o arquivo.");
        toast({
            variant: "destructive",
            title: "Erro ao Ler Arquivo",
            description: "Não foi possível pré-visualizar a imagem.",
        });
         setAnalysisError('Erro ao carregar a pré-visualização da imagem.');
         setPhotoFile(null);
         setPhotoPreview(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
      reader.readAsDataURL(file);
    } else {
        setPhotoFile(null);
        setPhotoPreview(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyzePhoto = async () => {
    if (!photoPreview) {
        toast({
            variant: "destructive",
            title: "Nenhuma Foto",
            description: "Selecione uma foto antes de analisar.",
        });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
       if (typeof photoPreview !== 'string' || !photoPreview.startsWith('data:image')) {
         throw new Error('Dados de imagem inválidos para análise.');
       }
       console.log("Sending photo for analysis...");
       const result = await analyzePlantPhoto({ photoDataUri: photoPreview });
       console.log("Analysis result received:", result);
       setAnalysisResult(result);
       toast({
           title: "Análise Concluída",
           description: "A IA analisou a foto.",
           variant: "default",
       });
    } catch (error) {
      console.error('Erro na Análise de IA:', error);
      const errorMsg = 'Falha ao analisar a foto. Verifique sua conexão ou tente uma imagem diferente.';
      setAnalysisError(errorMsg);
      toast({
          variant: "destructive",
          title: "Erro na Análise",
          description: errorMsg,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: DiaryEntryFormData) => {
     setIsSubmitting(true);
     setSubmitError(null);
     // Removed setUploadProgress

     console.log('Iniciando envio para localStorage:', data);
     // In a real app, you'd handle actual photo upload here before saving the entry
     // Since we're using localStorage, we'll just use a placeholder or the preview URI if needed

    try {
        // Use the Data URI from the preview as the photoUrl for mock storage.
        // In a real app, this would be the URL returned by the storage service.
        // If no preview, photoUrl remains null.
        const photoUrlForStorage = photoPreview;

        // Construct the new DiaryEntry object
        const newEntry: DiaryEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // More unique ID
            plantId: plantId,
            timestamp: new Date().toISOString(),
            authorId: 'local-user', // Placeholder user ID for local storage
            note: data.note,
            stage: data.stage || null,
            heightCm: data.heightCm ?? null,
            ec: data.ec ?? null,
            ph: data.ph ?? null,
            temp: data.temp ?? null,
            humidity: data.humidity ?? null,
            photoUrl: photoUrlForStorage, // Using the preview data URI (or null)
            aiSummary: analysisResult?.analysisResult || null,
        };

        console.log('Novo objeto de entrada:', newEntry);

        // Directly call the function to add the entry to localStorage
        addDiaryEntryToLocalStorage(plantId, newEntry);
        console.log('Entrada adicionada ao localStorage.');


        // Call the callback to update the parent component's UI immediately
        onNewEntry(newEntry);
        console.log('Callback onNewEntry chamado.');


        // Show success toast
         toast({
           title: "Entrada Salva",
           description: "Sua entrada no diário foi adicionada com sucesso.",
           variant: "default",
         });

        // Reset form state completely
        form.reset();
        setPhotoPreview(null);
        setPhotoFile(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
        console.log('Formulário e estados resetados.');


    } catch (error: any) {
        console.error('Erro ao salvar no localStorage:', error);
        const errorMsg = `Falha ao salvar a entrada do diário: ${error.message || 'Erro desconhecido'}`;
        setSubmitError(errorMsg);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: errorMsg,
        });
    } finally {
        setIsSubmitting(false);
        // Removed setUploadProgress(null)
        console.log('Finalizado o processo de envio.');
    }
  };


  return (
    <Card className="shadow-lg border border-primary/10 card">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl flex items-center gap-2">
            <Leaf className="text-primary h-6 w-6" /> Adicionar Nova Entrada no Diário
        </CardTitle>
        <CardDescription>Registre observações, medições e adicione uma foto para análise pela IA.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Note Section First */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Observações / Notas</FormLabel>
                  <FormControl>
                    <Textarea
                       placeholder="Descreva o que você vê, ações tomadas, ou qualquer detalhe relevante..." {...field}
                       disabled={isSubmitting}
                       rows={4}
                       className="textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurement Fields */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Medições (Opcional)</Label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                     <FormField
                       control={form.control}
                       name="stage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Estágio</FormLabel>
                           <FormControl>
                             <Input placeholder="ex: Floração S3" {...field} disabled={isSubmitting} className="input"/>
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                    <FormField
                        control={form.control}
                        name="heightCm"
                        render={({ field }) => (
                           <FormItem>
                             <FormLabel>Altura (cm)</FormLabel>
                             <FormControl>
                                <Input type="number" step="0.1" placeholder="ex: 45.5" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/>
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                        )}
                     />
                     <FormField
                         control={form.control}
                         name="ec"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>EC</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 1.6" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="ph"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>pH</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 6.0" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="temp"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Temp (°C)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 24.5" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="humidity"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Umidade (%)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="1" placeholder="ex: 55" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                 </div>
             </Card>


            {/* Photo Section */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Foto da Planta (Opcional)</Label>
                <div className="flex flex-col md:flex-row items-start gap-4">
                     {/* Upload Area */}
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-2 border-dashed border-secondary/30 rounded-lg p-6 text-center bg-background hover:border-primary/50 transition-colors aspect-video md:aspect-auto md:h-auto min-h-[150px]">
                        {photoPreview ? (
                             <div className="relative group w-full h-full flex items-center justify-center">
                                <Image
                                  data-ai-hint="cannabis plant user upload close up"
                                  src={photoPreview} // Display the Data URI preview
                                  alt="Pré-visualização da planta"
                                  layout="fill"
                                  objectFit="contain"
                                  className="rounded-md shadow-md"
                                />
                             </div>

                        ) : (
                           <div className="flex flex-col items-center text-muted-foreground">
                                <ImagePlus className="h-12 w-12 mb-2 text-secondary/50" />
                                <span className="text-sm">Arraste uma foto ou clique para selecionar</span>
                                <span className="text-xs mt-1">(Max 5MB)</span>
                           </div>
                        )}
                         <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                            aria-label="Carregar foto da planta"
                            disabled={isSubmitting || isAnalyzing}
                         />
                         <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4 button"
                            onClick={triggerFileInput}
                            disabled={isSubmitting || isAnalyzing}
                          >
                            <Upload className="mr-2 h-4 w-4" /> {photoPreview ? 'Trocar Foto' : 'Selecionar Foto'}
                         </Button>
                     </div>

                     {/* Analysis Area */}
                     <div className="w-full md:w-1/2 space-y-3">
                         <Button
                           type="button"
                           onClick={handleAnalyzePhoto}
                           disabled={!photoPreview || isAnalyzing || isSubmitting}
                           variant="secondary"
                           className="w-full button"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA...
                              </>
                            ) : (
                              <>
                                <Bot className="mr-2 h-4 w-4" /> Analisar Foto com IA
                              </>
                            )}
                         </Button>
                         {analysisResult && (
                           <Card className="bg-accent/10 border-accent p-3 shadow-sm">
                             <CardHeader className="p-0 mb-1">
                               <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-accent-foreground">
                                 <Bot className="h-4 w-4"/> Resultado da Análise IA
                               </CardTitle>
                             </CardHeader>
                             <CardContent className="p-0">
                                <p className="text-sm text-accent-foreground/90">{analysisResult.analysisResult}</p>
                             </CardContent>
                           </Card>
                         )}
                         {analysisError && (
                            <Alert variant="destructive" className="text-xs p-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro na Análise</AlertTitle>
                                <AlertDescription>{analysisError}</AlertDescription>
                           </Alert>
                         )}
                     </div>
                </div>
            </Card>


            {/* Submission Area */}
            <div className="pt-4 space-y-3">
                {/* Removed Progress Bar */}

                 {submitError && (
                    <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Erro ao Salvar</AlertTitle>
                      <AlertDescription className="text-sm">{submitError}</AlertDescription>
                     </Alert>
                 )}


                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || isAnalyzing}>
                   {isSubmitting ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Entrada...
                     </>
                   ) : (
                     'Salvar Entrada no Diário'
                   )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
