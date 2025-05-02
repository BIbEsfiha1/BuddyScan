
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Camera, Leaf, Bot, Loader2, AlertCircle, ImagePlus, RefreshCw, XCircle, VideoOff, Download } from 'lucide-react'; // Removed Upload
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
import { addDiaryEntryToLocalStorage } from '@/types/diary-entry';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { useAuth } from '@/context/auth-context'; // Remove useAuth import
// import { firebaseInitializationError } from '@/lib/firebase/config'; // Remove firebase config import

const diaryEntrySchema = z.object({
  note: z.string().min(1, 'A nota não pode estar vazia').max(1000, 'Nota muito longa (máx 1000 caracteres)'),
  stage: z.string().optional(),
  heightCm: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Altura deve ser um número' }).positive("Altura deve ser positiva").optional().nullable()
  ),
  ec: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
       z.number({ invalid_type_error: 'EC deve ser um número' }).positive("EC deve ser positivo").optional().nullable()
  ),
  ph: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
        z.number({ invalid_type_error: 'pH deve ser um número' }).min(0).max(14, "pH deve estar entre 0 e 14").optional().nullable()
  ),
  temp: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
         z.number({ invalid_type_error: 'Temperatura deve ser um número' }).optional().nullable()
   ),
  humidity: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
          z.number({ invalid_type_error: 'Umidade não pode ser negativa' }).min(0, "Umidade não pode ser negativa").max(100, "Umidade não pode ser maior que 100").optional().nullable()
   ),
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void;
}

type CameraStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'streaming' | 'error';

// Placeholder author ID when authentication is disabled
const GUEST_AUTHOR_ID = "guest-user";

export function DiaryEntryForm({ plantId, onNewEntry }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();
  // const { user, userId, initializationError } = useAuth(); // Remove auth context usage

  // Camera related state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


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

  // --- Stop Media Stream ---
  const stopMediaStream = useCallback(() => {
    console.log("Attempting to stop media stream in Diary Form...");
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log("Media stream stopped.");
    } else {
        console.log("No active media stream to stop.");
    }
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
        console.log("Video source object cleared.");
    }
    setCameraStatus('idle');
  }, []);

  // --- Request Camera Permission & Start Stream ---
  const startCamera = useCallback(async () => {
     console.log("Attempting to start camera in Diary Form...");
     setCameraError(null);
     setPhotoPreview(null);
     setAnalysisResult(null);
     setAnalysisError(null);
     setCameraStatus('permission-pending');
     setShowCameraView(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API (getUserMedia) not supported or available.');
        setCameraError('A API da câmera não é suportada neste navegador ou ambiente.');
        setCameraStatus('error');
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      console.log("Camera permission granted (environment facing).");
      streamRef.current = stream;

       if (videoRef.current) {
           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                setCameraStatus('streaming');
           } catch (playError) {
               console.error("Error trying to play video:", playError);
               setCameraError("Falha ao iniciar o vídeo da câmera.");
               setCameraStatus('error');
               stopMediaStream();
           }
       } else {
           console.warn("Video ref not available when stream was ready.");
           setCameraStatus('error');
           setCameraError('Falha ao configurar a visualização da câmera.');
           stopMediaStream();
       }

    } catch (error) {
       console.warn('Error accessing environment camera, trying default:', error);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default).");
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                console.log("Video stream attached (default).");
                 try {
                    await videoRef.current.play();
                    console.log("Video play initiated (default).");
                    setCameraStatus('streaming');
                 } catch (playError) {
                    console.error("Error trying to play default video:", playError);
                    setCameraError("Falha ao iniciar o vídeo da câmera padrão.");
                    setCameraStatus('error');
                    stopMediaStream();
                 }
            } else {
               console.warn("Video ref not available when default stream was ready.");
               setCameraStatus('error');
               setCameraError('Falha ao configurar a visualização da câmera padrão.');
               stopMediaStream();
           }
        } catch (finalError) {
            console.error('Error accessing any camera:', finalError);
            let errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
            if (finalError instanceof Error) {
                if (finalError.name === 'NotAllowedError') {
                    errorMsg = 'Permissão da câmera negada pelo usuário.';
                } else if (finalError.name === 'NotFoundError') {
                    errorMsg = 'Nenhuma câmera encontrada ou compatível.';
                } else if (finalError.name === 'NotReadableError' || finalError.name === 'OverconstrainedError') {
                    errorMsg = 'Câmera já em uso ou não pode ser lida.';
                } else {
                    errorMsg = `Erro ao acessar câmera: ${finalError.message}`;
                }
            }
            setCameraError(errorMsg);
            setCameraStatus('permission-denied');
            toast({
                variant: 'destructive',
                title: 'Erro de Câmera',
                description: errorMsg,
            });
            stopMediaStream();
        }
    }
  }, [stopMediaStream, toast]);


  // --- Capture Photo Logic ---
  const capturePhoto = useCallback(() => {
    if (cameraStatus !== 'streaming' || !videoRef.current || !canvasRef.current) {
      console.warn("Cannot capture photo, camera not ready or refs missing.");
      toast({ variant: "destructive", title: "Erro", description: "Câmera não está pronta para capturar." });
      return;
    }

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const context = canvasElement.getContext('2d');

    if (!context) {
      console.error("Failed to get canvas context.");
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível processar a imagem." });
      return;
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);

    setPhotoPreview(dataUrl);
    console.log("Photo captured successfully.");
    toast({ title: "Foto Capturada!", description: "Você pode analisar ou salvar a entrada." });
    stopMediaStream();
    setShowCameraView(false);

  }, [cameraStatus, toast, stopMediaStream]);


  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);


  // --- AI Analysis ---
  const handleAnalyzePhoto = async () => {
    if (!photoPreview) {
        toast({
            variant: "destructive",
            title: "Nenhuma Foto",
            description: "Capture uma foto antes de analisar.",
        });
        return;
    }
    // Remove Firebase init check
    // if (initializationError) {
    //    toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Serviço de análise indisponível.' });
    //    return;
    // }


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

  // --- Form Submission ---
  const onSubmit = async (data: DiaryEntryFormData) => {
     setIsSubmitting(true);
     setSubmitError(null);

     // Remove authentication check
     /*
     if (!userId) {
         setSubmitError("Você precisa estar logado para adicionar uma entrada.");
         toast({
             variant: "destructive",
             title: "Não Autenticado",
             description: "Faça login para salvar entradas no diário.",
         });
         setIsSubmitting(false);
         return;
     }
     if (initializationError) { // Check for Firebase init error
        setSubmitError("Erro de configuração: não é possível salvar.");
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não é possível salvar a entrada no diário.' });
        setIsSubmitting(false);
        return;
     }
     */

    // Use placeholder author ID
    const currentAuthorId = GUEST_AUTHOR_ID;
    console.log('Iniciando envio para localStorage:', data, 'by User:', currentAuthorId);

    try {
        const photoUrlForStorage = photoPreview;

        const newEntry: DiaryEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            plantId: plantId,
            timestamp: new Date().toISOString(),
            authorId: currentAuthorId, // Use placeholder ID
            note: data.note,
            stage: data.stage || null,
            heightCm: data.heightCm ?? null,
            ec: data.ec ?? null,
            ph: data.ph ?? null,
            temp: data.temp ?? null,
            humidity: data.humidity ?? null,
            photoUrl: photoUrlForStorage,
            aiSummary: analysisResult?.analysisResult || null,
        };

        console.log('Novo objeto de entrada:', newEntry);
        addDiaryEntryToLocalStorage(plantId, newEntry); // Save to local storage
        console.log('Entrada adicionada ao armazenamento.');

        onNewEntry(newEntry);
        console.log('Callback onNewEntry chamado.');

         toast({
           title: "Entrada Salva",
           description: "Sua entrada no diário foi adicionada com sucesso.",
           variant: "default",
         });

        form.reset();
        setPhotoPreview(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        console.log('Formulário e estados resetados.');

    } catch (error: any) {
        console.error('Erro ao salvar entrada:', error);
        const errorMsg = `Falha ao salvar a entrada do diário: ${error.message || 'Erro desconhecido'}`;
        setSubmitError(errorMsg);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: errorMsg,
        });
    } finally {
        setIsSubmitting(false);
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
                       disabled={isSubmitting} // Remove init error check
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
                                <Input type="number" step="0.1" placeholder="ex: 45.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} className="input"/>
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
                                     <Input type="number" step="0.1" placeholder="ex: 1.6" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} className="input"/>
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
                                     <Input type="number" step="0.1" placeholder="ex: 6.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} className="input"/>
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
                                     <Input type="number" step="0.1" placeholder="ex: 24.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} className="input"/>
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
                                     <Input type="number" step="1" placeholder="ex: 55" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                 </div>
             </Card>


            {/* Photo Section - Updated for Camera */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Foto da Planta (Opcional)</Label>
                <div className="flex flex-col md:flex-row items-start gap-4">
                     {/* Camera/Preview Area */}
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-2 border-dashed border-secondary/30 rounded-lg p-2 text-center bg-background transition-colors aspect-video md:aspect-auto md:h-auto min-h-[200px] relative overflow-hidden">
                         <canvas ref={canvasRef} className="hidden"></canvas>

                        {showCameraView && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                                <video
                                    ref={videoRef}
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${cameraStatus === 'streaming' ? 'opacity-100' : 'opacity-0'}`}
                                    playsInline
                                    muted
                                    autoPlay
                                />
                                {cameraStatus === 'permission-pending' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                        <Loader2 className="h-10 w-10 animate-spin mb-3" />
                                        <p className="font-semibold">Aguardando permissão...</p>
                                    </div>
                                )}
                                {cameraStatus === 'permission-denied' && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                         <VideoOff className="h-10 w-10 text-destructive mb-3" />
                                         <p className="font-semibold text-destructive">Acesso negado</p>
                                         <p className="text-sm text-center mt-1">{cameraError || "Permissão da câmera negada."}</p>
                                          <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} >Tentar Novamente</Button> {/* Removed disable */}
                                     </div>
                                )}
                                 {cameraStatus === 'error' && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                         <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                                         <p className="font-semibold text-destructive">Erro na câmera</p>
                                         <p className="text-sm text-center mt-1">{cameraError || "Não foi possível iniciar a câmera."}</p>
                                          <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} >Tentar Novamente</Button> {/* Removed disable */}
                                     </div>
                                )}
                            </div>
                        )}

                        {!showCameraView && photoPreview && (
                             <div className="relative group w-full h-full flex items-center justify-center">
                                <Image
                                  data-ai-hint="cannabis plant user upload close up"
                                  src={photoPreview}
                                  alt="Pré-visualização da planta"
                                  layout="fill"
                                  objectFit="contain"
                                  className="rounded-md shadow-md"
                                />
                                <Button
                                     variant="outline"
                                     size="sm"
                                     className="absolute bottom-2 right-2 z-10 opacity-80 hover:opacity-100 button"
                                     onClick={() => { setPhotoPreview(null); startCamera(); }}
                                     disabled={isSubmitting || isAnalyzing} // Remove init error check
                                >
                                     <RefreshCw className="mr-2 h-4 w-4" /> Retirar Foto
                                </Button>
                             </div>
                        )}

                        {!showCameraView && !photoPreview && (
                           <div className="flex flex-col items-center text-muted-foreground p-4">
                                <Camera className="h-12 w-12 mb-3 text-secondary/50" />
                                <span className="text-sm font-medium">Adicionar Foto</span>
                                <span className="text-xs mt-1 text-center">Clique abaixo para ativar a câmera e capturar uma imagem.</span>
                                 <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     className="mt-4 button"
                                     onClick={startCamera}
                                     disabled={isSubmitting || isAnalyzing || cameraStatus === 'permission-pending'} // Remove init error check
                                   >
                                     <Camera className="mr-2 h-4 w-4" /> Abrir Câmera
                                </Button>
                           </div>
                        )}

                        {showCameraView && cameraStatus === 'streaming' && (
                             <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
                                <Button
                                     type="button"
                                     variant="destructive"
                                     size="icon"
                                     className="rounded-full h-12 w-12 shadow-lg button"
                                     onClick={() => { stopMediaStream(); setShowCameraView(false); }}
                                     disabled={isSubmitting || isAnalyzing} // Remove init error check
                                     aria-label="Cancelar Câmera"
                                >
                                     <XCircle className="h-6 w-6" />
                                </Button>
                                <Button
                                     type="button"
                                     variant="default"
                                     size="icon"
                                     className="rounded-full h-16 w-16 shadow-lg button border-4 border-background"
                                     onClick={capturePhoto}
                                     disabled={isSubmitting || isAnalyzing} // Remove init error check
                                     aria-label="Capturar Foto"
                                >
                                     <Camera className="h-7 w-7" />
                                </Button>
                             </div>
                        )}
                     </div>


                     {/* Analysis Area */}
                     <div className="w-full md:w-1/2 space-y-3">
                         <Button
                           type="button"
                           onClick={handleAnalyzePhoto}
                           disabled={!photoPreview || isAnalyzing || isSubmitting || showCameraView} // Remove init error check
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
                 {submitError && (
                    <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Erro ao Salvar</AlertTitle>
                      <AlertDescription className="text-sm">{submitError}</AlertDescription>
                     </Alert>
                 )}

                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || isAnalyzing || showCameraView}>
                   {isSubmitting ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Entrada...
                     </>
                   ) : (
                     'Salvar Entrada no Diário'
                   )}
                </Button>
                {/* Remove message related to login */}
                 {/* {(!userId || initializationError) && (...) } */}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
