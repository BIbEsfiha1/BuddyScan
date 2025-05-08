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
import {
    Camera, Leaf, Bot, Loader2, AlertCircle, ImagePlus, RefreshCw, XCircle, VideoOff,
    Download, ClipboardList, Gauge, FlaskConical, Thermometer, Droplet, Ruler, Layers, CheckCircle, Upload // Added Upload icon
} from '@/components/ui/lucide-icons'; // Use centralized icons, added CheckCircle
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
// Import Firestore add function (now uses client db)
import { addDiaryEntryToFirestore } from '@/types/diary-entry';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Import client-side db instance (implicitly used by service function)
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { cn } from '@/lib/utils'; // Import cn

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
         (val) => (val === "" || val === undefined ? undefined : Number(val)),
         z.number({ invalid_type_error: 'Temperatura deve ser um número' }).optional().nullable()
   ),
  humidity: z.preprocess(
         (val) => (val === "" || val === undefined ? undefined : Number(val)),
          z.number({ invalid_type_error: 'Umidade não pode ser negativa' }).min(0, "Umidade não pode ser negativa").max(100, "Umidade não pode ser maior que 100").optional().nullable()
   ),
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void;
}

type CameraStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'streaming' | 'error';

export function DiaryEntryForm({ plantId, onNewEntry }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading, authError } = useAuth(); // Get user and auth loading state

  // Camera related state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Determine if there's a critical initialization error (db or auth error)
  const isDbUnavailable = !db || !!authError;

  // Determine if the form should be globally disabled
  const isDisabled = isSubmitting || isAnalyzing || showCameraView || isDbUnavailable || authLoading || !user;


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

  // --- Clear Photo/Analysis State ---
  const clearPhotoState = () => {
      setPhotoPreview(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
      }
      console.log("Photo state cleared.");
  };

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
     clearPhotoState(); // Clear any existing photo/analysis
     setCameraStatus('permission-pending');
     setShowCameraView(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API (getUserMedia) not supported or available.');
        setCameraError('A API da câmera não é suportada neste navegador ou ambiente.');
        setCameraStatus('error');
        setShowCameraView(false); // Hide camera view on error
        return;
    }

    try {
        // Prioritize environment camera
        console.log("Requesting environment camera...");
        let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        console.log("Camera permission granted (environment facing). Stream tracks:", stream.getTracks());
        streamRef.current = stream;

       if (videoRef.current) {
           videoRef.current.srcObject = stream;
           const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
           videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';
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
               setShowCameraView(false);
           }
       } else {
           console.warn("Video ref not available when stream was ready.");
           setCameraStatus('error');
           setCameraError('Falha ao configurar a visualização da câmera.');
           stopMediaStream();
           setShowCameraView(false);
       }

    } catch (error: any) {
       console.warn(`Error accessing environment camera (${error.name}), trying default:`, error);
        // Fallback to default camera
        try {
            console.log("Requesting default camera...");
            let stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default). Stream tracks:", stream.getTracks());
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
                videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';
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
                    setShowCameraView(false);
                 }
            } else {
               console.warn("Video ref not available when default stream was ready.");
               setCameraStatus('error');
               setCameraError('Falha ao configurar a visualização da câmera padrão.');
               stopMediaStream();
               setShowCameraView(false);
           }
        } catch (finalError: any) {
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
            setShowCameraView(false);
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

    // Apply mirroring if the video element is mirrored
    if (videoElement.style.transform === 'scaleX(-1)') {
        context.translate(canvasElement.width, 0);
        context.scale(-1, 1);
    }

    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    // Use JPEG for potentially smaller size, adjust quality (0.9 = 90%)
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);

    setPhotoPreview(dataUrl);
    console.log("Photo captured successfully.");
    toast({ title: "Foto Capturada!", description: "Você pode analisar ou salvar a entrada." });
    stopMediaStream();
    setShowCameraView(false);

  }, [cameraStatus, toast, stopMediaStream]);

   // --- Handle File Input Change ---
   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onloadend = () => {
         const dataUrl = reader.result as string;
         setPhotoPreview(dataUrl);
         setAnalysisResult(null); // Clear previous analysis
         setAnalysisError(null);
         console.log("Photo uploaded successfully from file.");
         toast({ title: "Foto Carregada!", description: "Você pode analisar ou salvar a entrada." });
       };
       reader.onerror = (error) => {
         console.error("Error reading file:", error);
         toast({ variant: "destructive", title: "Erro ao Ler Arquivo", description: "Não foi possível carregar a imagem." });
       };
       reader.readAsDataURL(file);
     }
   };

   // --- Trigger File Input ---
   const triggerFileInput = () => {
     fileInputRef.current?.click();
   };


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
            description: "Capture ou carregue uma foto antes de analisar.",
        });
        return;
    }
     // Check if DB (and implicitly Firebase services) is available
     if (isDbUnavailable) {
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Serviço de análise indisponível.' });
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
      const errorMsg = `Falha ao analisar a foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
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

     // Check for DB availability first
     if (isDbUnavailable) {
         const errorMsg = authError?.message || 'Serviço de banco de dados indisponível.';
         console.error("Firestore DB not available:", errorMsg);
         setSubmitError(`Erro de Configuração: ${errorMsg} Não é possível salvar.`);
         toast({
             variant: 'destructive',
             title: 'Erro de Configuração',
             description: 'Não foi possível conectar ao banco de dados.',
         });
         setIsSubmitting(false);
         return;
     }
     // Check if user is logged in
      if (!user) {
          setSubmitError('Usuário não autenticado. Faça login para salvar.');
          toast({ variant: 'destructive', title: 'Não Autenticado', description: 'Faça login para registrar entradas no diário.' });
          setIsSubmitting(false);
          return;
      }

    // Use the actual logged-in user's ID
    const currentAuthorId = user.uid;
    console.log('Iniciando envio para Firestore:', data, 'by User:', currentAuthorId);

    try {
        const photoUrlForStorage = photoPreview; // Store data URI for now

        // Prepare data, excluding the ID field for Firestore's addDoc
        const newEntryData: Omit<DiaryEntry, 'id'> = {
            plantId: plantId,
            timestamp: new Date().toISOString(), // Use current time as ISO string
            authorId: currentAuthorId, // Use actual author ID
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

        console.log('Novo objeto de entrada para Firestore:', newEntryData);

        // Call Firestore service function (uses client db)
        const savedEntry = await addDiaryEntryToFirestore(plantId, newEntryData);
        console.log('Entrada adicionada ao Firestore com ID:', savedEntry.id);

        // Call the callback prop with the full entry object (including the new ID)
        onNewEntry(savedEntry);
        console.log('Callback onNewEntry chamado com a entrada salva.');

         toast({
           title: "Entrada Salva",
           description: "Sua entrada no diário foi adicionada com sucesso.",
           variant: "default",
         });

        form.reset();
        clearPhotoState(); // Clear photo and analysis
        console.log('Formulário e estados resetados.');

    } catch (error: any) {
        console.error('Erro ao salvar entrada no Firestore:', error);
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
            <ClipboardList className="text-primary h-6 w-6" /> Adicionar Nova Entrada
        </CardTitle>
        <CardDescription>Registre observações, medições e adicione uma foto para análise.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

             {/* Global Error/Auth Messages */}
              {isDbUnavailable && (
                 <Alert variant="destructive" className="p-3">
                   <AlertCircle className="h-4 w-4"/>
                   <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                   <AlertDescription className="text-sm">{authError?.message || 'Serviço de banco de dados indisponível.'} Não é possível salvar.</AlertDescription>
                 </Alert>
              )}
             {authLoading && !isDbUnavailable && (
                  <Alert variant="default" className="p-3 border-blue-500/50 bg-blue-500/10">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600"/>
                      <AlertTitle>Verificando Autenticação...</AlertTitle>
                      <AlertDescription className="text-sm text-blue-700">Aguarde enquanto verificamos seu login.</AlertDescription>
                  </Alert>
             )}
             {!authLoading && !user && !isDbUnavailable && (
                  <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Login Necessário</AlertTitle>
                      <AlertDescription className="text-sm">Você precisa estar logado para adicionar entradas no diário.</AlertDescription>
                  </Alert>
             )}


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
                       disabled={isDisabled}
                       rows={4}
                       className="textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurement Fields */}
             <Card className="bg-muted/30 border border-border/50 p-4 rounded-lg"> {/* Added rounded-lg */}
                 <Label className="text-base font-medium mb-3 block">Medições (Opcional)</Label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                     <FormField
                       control={form.control}
                       name="stage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-secondary"/>Estágio</FormLabel>
                           <FormControl>
                             <Input placeholder="ex: Floração S3" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} disabled={isDisabled} className="input"/>
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
                             <FormLabel className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary"/>Altura (cm)</FormLabel>
                             <FormControl>
                                <Input type="number" step="0.1" placeholder="ex: 45.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isDisabled} className="input"/>
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
                                 <FormLabel className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-secondary"/>EC</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 1.6" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isDisabled} className="input"/>
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
                                 <FormLabel className="flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-secondary"/>pH</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 6.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isDisabled} className="input"/>
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
                                 <FormLabel className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary"/>Temp (°C)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 24.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isDisabled} className="input"/>
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
                                 <FormLabel className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-secondary"/>Umidade (%)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="1" placeholder="ex: 55" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isDisabled} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                 </div>
             </Card>


             {/* Photo Section */}
             <Card className="bg-muted/30 border border-border/50 p-4 rounded-lg space-y-4">
                <Label className="text-base font-medium block">Foto da Planta (Opcional)</Label>

                {/* Camera/Preview Area */}
                <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-secondary/30 rounded-lg p-2 text-center bg-background transition-colors min-h-[200px] relative overflow-hidden">
                    <canvas ref={canvasRef} className="hidden"></canvas>

                    {/* Video Element (Hidden when not streaming) */}
                    <video
                        ref={videoRef}
                        className={cn(
                            `absolute inset-0 w-full h-full object-cover transition-opacity duration-300`,
                            showCameraView && cameraStatus === 'streaming' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        )}
                        playsInline
                        muted
                        autoPlay
                        // Ensure transform style is applied if needed for mirroring
                        style={{ transform: videoRef.current?.style.transform || 'scaleX(1)' }}
                    />

                    {/* Overlays for Camera Status */}
                    {showCameraView && cameraStatus === 'permission-pending' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                            <Loader2 className="h-10 w-10 animate-spin mb-3" />
                            <p className="font-semibold">Aguardando permissão...</p>
                        </div>
                    )}
                     {showCameraView && cameraStatus === 'permission-denied' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                            <VideoOff className="h-10 w-10 text-destructive mb-3" />
                            <p className="font-semibold text-destructive">Acesso negado</p>
                            <p className="text-sm text-center mt-1">{cameraError || "Permissão da câmera negada."}</p>
                            <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} disabled={isDisabled}>Tentar Novamente</Button>
                        </div>
                    )}
                    {showCameraView && cameraStatus === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                            <p className="font-semibold text-destructive">Erro na câmera</p>
                            <p className="text-sm text-center mt-1">{cameraError || "Não foi possível iniciar a câmera."}</p>
                            <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} disabled={isDisabled}>Tentar Novamente</Button>
                        </div>
                    )}

                     {/* Photo Preview */}
                     {!showCameraView && photoPreview && (
                         <div className="relative group w-full h-[250px] flex items-center justify-center"> {/* Fixed height for preview */}
                            <Image
                              data-ai-hint="cannabis plant user upload close up"
                              src={photoPreview}
                              alt="Pré-visualização da planta"
                              layout="fill"
                              objectFit="contain"
                              className="rounded-md shadow-md"
                            />
                            <Button
                                 variant="destructive" // Changed to destructive
                                 size="icon"
                                 className="absolute top-2 right-2 z-10 opacity-80 hover:opacity-100 button rounded-full h-8 w-8" // Smaller button
                                 onClick={clearPhotoState}
                                 disabled={isDisabled}
                                 aria-label="Remover foto"
                            >
                                 <XCircle className="h-5 w-5" /> {/* Keep icon size */}
                            </Button>
                         </div>
                     )}

                     {/* Placeholder when no photo/camera */}
                     {!showCameraView && !photoPreview && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 min-h-[200px]">
                            <ImagePlus className="h-12 w-12 mb-3 text-secondary/50" />
                            <span className="text-sm font-medium">Nenhuma foto selecionada</span>
                            <span className="text-xs mt-1 text-center">Use a câmera ou carregue um arquivo.</span>
                        </div>
                     )}
                 </div>

                 {/* Camera Controls (Visible only when streaming) */}
                 {showCameraView && cameraStatus === 'streaming' && (
                     <div className="flex gap-3 justify-center mt-3">
                        <Button
                             type="button"
                             variant="destructive"
                             size="icon"
                             className="rounded-full h-12 w-12 shadow-lg button"
                             onClick={() => { stopMediaStream(); setShowCameraView(false); }}
                             disabled={isDisabled}
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
                             disabled={isDisabled}
                             aria-label="Capturar Foto"
                        >
                             <Camera className="h-7 w-7" />
                        </Button>
                     </div>
                 )}

                 {/* Buttons for Camera/Upload (Visible when no camera view) */}
                 {!showCameraView && (
                     <div className="flex flex-col sm:flex-row gap-3 mt-3">
                         {/* Hidden file input */}
                         <Input
                           ref={fileInputRef}
                           type="file"
                           accept="image/*"
                           onChange={handleFileChange}
                           className="hidden"
                           disabled={isDisabled}
                         />
                         {/* Camera Button */}
                         <Button
                             type="button"
                             variant="outline"
                             className="flex-1 button"
                             onClick={startCamera}
                             disabled={isDisabled || cameraStatus === 'permission-pending'}
                         >
                             <Camera className="mr-2 h-4 w-4" /> Abrir Câmera
                         </Button>
                         {/* Upload Button */}
                         <Button
                           type="button"
                           variant="outline"
                           className="flex-1 button"
                           onClick={triggerFileInput}
                           disabled={isDisabled}
                         >
                           <Upload className="mr-2 h-4 w-4" /> Carregar Arquivo
                         </Button>
                     </div>
                 )}

                 {/* AI Analysis Area (Always visible if photo exists) */}
                 {photoPreview && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                          <Button
                            type="button"
                            onClick={handleAnalyzePhoto}
                            disabled={!photoPreview || isDisabled}
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
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent-foreground">
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
                 )}
             </Card>


            {/* Submission Area */}
            <div className="pt-4 space-y-3">
                 {submitError && !isDbUnavailable && ( // Only show if not critical error
                    <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Erro ao Salvar</AlertTitle>
                      <AlertDescription className="text-sm">{submitError}</AlertDescription>
                     </Alert>
                 )}

                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isDisabled}>
                   {isSubmitting ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Entrada...
                     </>
                   ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" /> Salvar Entrada no Diário {/* Updated Icon */}
                      </>
                   )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
