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
import { Camera, Upload, Leaf, Bot, Loader2, AlertCircle, ImagePlus } from 'lucide-react'; // Added ImagePlus
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label'; // Import Label explicitly
import { useToast } from '@/hooks/use-toast'; // Import useToast


const diaryEntrySchema = z.object({
  note: z.string().min(1, 'A nota não pode estar vazia').max(500, 'Nota muito longa'), // Translated
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
  // Photo data is handled separately
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void;
}

export function DiaryEntryForm({ plantId, onNewEntry }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast(); // Initialize toast


  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DiaryEntryFormData>({
    resolver: zodResolver(diaryEntrySchema),
    defaultValues: {
      note: '',
      // Optional fields default to undefined implicitly which works with zod .optional()
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
           toast({ // Use toast for user feedback
                variant: "destructive",
                title: "Tipo de Arquivo Inválido",
                description: "Por favor, selecione um arquivo de imagem (JPEG, PNG, GIF, etc.).",
           });
           console.error("Arquivo selecionado não é uma imagem.");
           setAnalysisError('Por favor, selecione um arquivo de imagem válido.'); // Keep analysisError state if needed
           // Clear file input value
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
      }
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ // Use toast for user feedback
                variant: "destructive",
                title: "Arquivo Muito Grande",
                description: `O arquivo excede o limite de 5MB (${(file.size / (1024*1024)).toFixed(2)}MB).`,
            });
           console.error("Arquivo muito grande.");
            setAnalysisError('A imagem é muito grande. O limite é 5MB.');
           // Clear file input value
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
       }

      setPhotoFile(file);
       setAnalysisError(null); // Clear previous errors
       setAnalysisResult(null); // Reset analysis if new photo is selected
       // Reset preview before reading new file
       setPhotoPreview(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
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
        // Handle case where user cancels file selection
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
        // Ensure photoPreview is a valid data URI string
       if (typeof photoPreview !== 'string' || !photoPreview.startsWith('data:image')) {
         throw new Error('Dados de imagem inválidos para análise.');
       }
       const result = await analyzePlantPhoto({ photoDataUri: photoPreview });
       setAnalysisResult(result);
       toast({
           title: "Análise Concluída",
           description: "A IA analisou a foto.",
           variant: "default", // Use default or success variant
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
     setUploadProgress(0); // Start progress


    // TODO: Replace with actual backend submission logic (e.g., Firebase Storage & Firestore)
    console.log('Enviando dados:', data);
    console.log('Arquivo da foto:', photoFile);
    console.log('Resultado da análise:', analysisResult);

    // Simulate upload/save process
    try {
        // 1. Simulate photo upload if exists (replace with actual upload)
        let photoUrl = null;
        if (photoFile && photoPreview) {
          console.log('Simulando upload da foto...');
          // In real app: call upload function (e.g., uploadBytesResumable to Firebase Storage)
          // Listen to progress updates and call setUploadProgress
          for (let i = 1; i <= 5; i++) {
            await new Promise(res => setTimeout(res, 200)); // Shorter delay
             if (!isSubmitting) throw new Error("Submissão cancelada");
            setUploadProgress(i * 20);
          }
          // In real app, get URL from upload response (e.g., getDownloadURL)
          // Using a cannabis-related seed for placeholder
          photoUrl = `https://picsum.photos/seed/cannabis-plant-diary-${Date.now()}/400/300`;
          console.log('Upload simulado da foto concluído:', photoUrl);
        } else {
            // No photo to upload, still simulate some processing time
            await new Promise(res => setTimeout(res, 100));
             if (!isSubmitting) throw new Error("Submissão cancelada");
            setUploadProgress(100); // Indicate completion even without upload
            console.log('Nenhuma foto para enviar.');
        }


        // 2. Construct the new DiaryEntry object
        const newEntry: DiaryEntry = {
            id: `entry-${Date.now()}`, // Temporary ID - replace with ID from backend save
            plantId: plantId,
            timestamp: new Date().toISOString(),
            authorId: 'simulated-user-id', // Replace with actual authenticated user ID
            note: data.note,
            stage: data.stage || null, // Ensure null if undefined
            heightCm: data.heightCm ?? null,
            ec: data.ec ?? null,
            ph: data.ph ?? null,
            temp: data.temp ?? null,
            humidity: data.humidity ?? null,
            photoUrl: photoUrl,
            aiSummary: analysisResult?.analysisResult || null,
        };

        // 3. Simulate saving entry data to backend (e.g., addDoc to Firestore)
        console.log('Simulando salvamento da entrada no banco de dados...');
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate save delay
         if (!isSubmitting) throw new Error("Submissão cancelada");
        console.log('Salvamento simulado concluído:', newEntry);


        // 4. Call the callback to update the UI optimistically
        onNewEntry(newEntry);

        // 5. Show success toast
         toast({
           title: "Entrada Salva",
           description: "Sua entrada no diário foi adicionada com sucesso.",
           variant: "default", // Or a success variant if defined
         });

        // 6. Reset form state completely
        form.reset();
        setPhotoPreview(null);
        setPhotoFile(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input

    } catch (error: any) {
        console.error('Erro no envio:', error);
         if (error.message !== "Submissão cancelada") {
            const errorMsg = 'Falha ao salvar a entrada do diário. Por favor, tente novamente.';
            setSubmitError(errorMsg);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: errorMsg,
            });
         } else {
             console.log("Submissão foi cancelada.");
             toast({
                 title: "Envio Cancelado",
                 description: "A operação de salvamento foi cancelada.",
                 variant: "default",
             });
         }
    } finally {
        setIsSubmitting(false);
        setUploadProgress(null); // Hide progress bar
    }
  };


  return (
    <Card className="shadow-lg border border-primary/10 card"> {/* Adjusted border, added base card class */}
      <CardHeader className="pb-4"> {/* Reduced bottom padding */}
        <CardTitle className="text-2xl flex items-center gap-2"> {/* Increased size */}
            <Leaf className="text-primary h-6 w-6" /> Adicionar Nova Entrada no Diário {/* Translated */}
        </CardTitle>
        <CardDescription>Registre observações, medições e adicione uma foto para análise pela IA.</CardDescription> {/* Translated, emphasizing AI */}
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
                  <FormLabel className="text-base font-medium">Observações / Notas</FormLabel> {/* Translated, increased size/weight */}
                  <FormControl>
                    <Textarea
                       placeholder="Descreva o que você vê, ações tomadas, ou qualquer detalhe relevante..." {...field}
                       disabled={isSubmitting}
                       rows={4} // Slightly larger text area
                       className="textarea" // Added base textarea class
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurement Fields - Improved Layout */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Medições (Opcional)</Label> {/* Section Label */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                     <FormField
                       control={form.control}
                       name="stage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Estágio</FormLabel> {/* Translated */}
                           <FormControl>
                             {/* Consider using a Select component here */}
                             <Input placeholder="ex: Floração S3" {...field} disabled={isSubmitting} className="input"/> {/* Translated, added base input class */}
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
                             <FormLabel>Altura (cm)</FormLabel> {/* Translated */}
                             <FormControl>
                                <Input type="number" step="0.1" placeholder="ex: 45.5" {...field} value={field.value ?? ''} disabled={isSubmitting} className="input"/> {/* Handle null value for controlled input */}
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
                                 <FormLabel>Umidade (%)</FormLabel> {/* Translated */}
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
                 <Label className="text-base font-medium mb-3 block">Foto da Planta (Opcional)</Label> {/* Section Label */}
                <div className="flex flex-col md:flex-row items-start gap-4">
                     {/* Upload Area */}
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-2 border-dashed border-secondary/30 rounded-lg p-6 text-center bg-background hover:border-primary/50 transition-colors aspect-video md:aspect-auto md:h-auto min-h-[150px]">
                        {photoPreview ? (
                             <div className="relative group w-full h-full flex items-center justify-center">
                                <Image
                                  data-ai-hint="cannabis plant user upload close up" // More specific hint
                                  src={photoPreview}
                                  alt="Pré-visualização da planta" // Translated
                                  // Use fill and object-contain/cover for better responsive image handling
                                  layout="fill"
                                  objectFit="contain" // or 'cover' depending on desired behavior
                                  className="rounded-md shadow-md"
                                />
                                {/* Option to remove photo? Consider adding a small 'x' button */}
                                {/* <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100" onClick={() => { setPhotoPreview(null); setPhotoFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}><X className="h-4 w-4"/></Button> */}
                             </div>

                        ) : (
                           <div className="flex flex-col items-center text-muted-foreground">
                                <ImagePlus className="h-12 w-12 mb-2 text-secondary/50" />
                                <span className="text-sm">Arraste uma foto ou clique para selecionar</span> {/* Translated */}
                                <span className="text-xs mt-1">(Max 5MB)</span>
                           </div>
                        )}
                         <Input
                            type="file"
                            accept="image/*" // Accepts any image type
                            onChange={handleFileChange}
                            className="hidden" // Visually hidden, triggered by button
                            ref={fileInputRef}
                            aria-label="Carregar foto da planta" // Translated
                            disabled={isSubmitting || isAnalyzing}
                         />
                         <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4 button" // Added base class
                            onClick={triggerFileInput}
                            disabled={isSubmitting || isAnalyzing}
                          >
                            <Upload className="mr-2 h-4 w-4" /> {photoPreview ? 'Trocar Foto' : 'Selecionar Foto'} {/* Translated */}
                         </Button>
                     </div>

                     {/* Analysis Area */}
                     <div className="w-full md:w-1/2 space-y-3">
                         <Button
                           type="button"
                           onClick={handleAnalyzePhoto}
                           disabled={!photoPreview || isAnalyzing || isSubmitting}
                           variant="secondary"
                           className="w-full button" // Added base class
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA... {/* Translated */}
                              </>
                            ) : (
                              <>
                                <Bot className="mr-2 h-4 w-4" /> Analisar Foto com IA {/* Translated */}
                              </>
                            )}
                         </Button>
                         {analysisResult && (
                           <Card className="bg-accent/10 border-accent p-3 shadow-sm">
                             <CardHeader className="p-0 mb-1">
                               <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-accent-foreground">
                                 <Bot className="h-4 w-4"/> Resultado da Análise IA {/* Translated */}
                               </CardTitle>
                             </CardHeader>
                             <CardContent className="p-0">
                                <p className="text-sm text-accent-foreground/90">{analysisResult.analysisResult}</p>
                             </CardContent>
                           </Card>
                         )}
                         {analysisError && (
                            <Alert variant="destructive" className="text-xs p-2"> {/* Smaller alert */}
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro na Análise</AlertTitle> {/* Changed title */}
                                <AlertDescription>{analysisError}</AlertDescription>
                           </Alert>
                         )}
                     </div>
                </div>
            </Card>


            {/* Submission Area */}
            <div className="pt-4 space-y-3">
                {uploadProgress !== null && (
                  <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Progresso do Salvamento...</Label> {/* Translated */}
                      <Progress value={uploadProgress} className="w-full h-2 bg-muted border" /> {/* Added border */}
                  </div>
                 )}

                 {submitError && (
                    <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Erro ao Salvar</AlertTitle> {/* Translated */}
                      <AlertDescription className="text-sm">{submitError}</AlertDescription>
                     </Alert>
                 )}


                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || isAnalyzing}> {/* Larger submit button */}
                   {isSubmitting ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Entrada... {/* Translated */}
                     </>
                   ) : (
                     'Salvar Entrada no Diário' // Translated
                   )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
