'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History,
    AlertCircle as AlertCircleIcon, Camera, Zap, Package, Home as HomeIcon
} from '@/components/ui/lucide-icons'; // Use centralized icons
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger // Import DialogTrigger
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RecentPlants from '@/components/dashboard/recent-plants';
import AttentionPlants from '@/components/dashboard/attention-plants';
import { Separator } from '@/components/ui/separator';
import type { Plant } from '@/services/plant-id'; // Import Plant type
import { getRecentPlants, getAttentionPlants, getPlantById } from '@/services/plant-id'; // Import Firestore fetch functions
import Image from 'next/image'; // Import Image component
import { cn } from '@/lib/utils'; // Import cn utility
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import firebase error state
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components


// Define states for camera/scanner
type ScannerStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'initializing' | 'scanning' | 'stopped' | 'error';

export default function DashboardPage() { // Renamed component to DashboardPage
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any | null>(barcodeDetectorRef.current); // Using any for BarcodeDetector due to type issues
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Track mount state
  const [isScannerSupported, setIsScannerSupported] = useState(false); // State for scanner support

  // State for fetched plant data
  const [recentPlants, setRecentPlants] = useState<Plant[]>([]);
  const [attentionPlants, setAttentionPlants] = useState<Plant[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  // State for general error display
  const [error, setError] = useState<string | null>(null);


  // Track mount state and check scanner support
  useEffect(() => {
    setIsMounted(true);
    // Check for BarcodeDetector support once the component is mounted on the client
    if (typeof window !== 'undefined') {
      const supported = 'BarcodeDetector' in window && typeof BarcodeDetector !== 'undefined';
      setIsScannerSupported(supported);
      console.log(`BarcodeDetector supported: ${supported}`);
      if (supported && !barcodeDetectorRef.current) {
        try {
          // @ts-ignore - Suppress type checking for experimental API
          barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
          console.log('BarcodeDetector initialized successfully.');
        } catch (initError) {
          console.error('Failed to initialize BarcodeDetector:', initError);
          setIsScannerSupported(false); // Mark as unsupported if init fails
        }
      }
    }
    return () => setIsMounted(false);
  }, []); // Empty dependency array ensures this runs only once


   // --- Fetch Plant Data Function ---
   const fetchPlants = useCallback(async () => {
     console.log("Fetching plant data from Firestore service...");
     setIsLoadingPlants(true);
     setError(null); // Reset error state

     // Check for Firebase initialization errors before proceeding
     if (firebaseInitializationError) {
         console.error("Firebase initialization error:", firebaseInitializationError);
         setError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível buscar dados.`);
         setIsLoadingPlants(false);
         return;
     }


     try {
       // Use the Firestore service functions
       const [fetchedRecent, fetchedAttention] = await Promise.all([
         getRecentPlants(5), // Fetch 5 recent plants
         getAttentionPlants(5) // Fetch 5 attention plants
       ]);
       console.log("Fetched recent plants:", fetchedRecent);
       console.log("Fetched attention plants:", fetchedAttention);
       setRecentPlants(fetchedRecent);
       setAttentionPlants(fetchedAttention);
     } catch (error) {
       console.error('Failed to fetch plant data from Firestore:', error);
       const errorMsg = `Não foi possível buscar os dados das plantas. ${error instanceof Error ? error.message : ''}`;
       setError(errorMsg); // Set error state
       toast({
         variant: 'destructive',
         title: 'Erro ao Carregar Dados',
         description: errorMsg,
       });
     } finally {
       setIsLoadingPlants(false);
        console.log("Finished fetching plant data.");
     }
   }, [toast]); // Dependency: toast


   // --- Effect to fetch plant data on mount and when dialog closes ---
   useEffect(() => {
     if (isMounted && !isDialogOpen) { // Fetch only when mounted and dialog is closed
        console.log("Component mounted or dialog closed, fetching plants.");
        fetchPlants();
     } else {
        console.log(`Skipping plant fetch. Mounted: ${isMounted}, Dialog Open: ${isDialogOpen}`);
     }
   }, [isMounted, isDialogOpen, fetchPlants]); // Run on mount and when dialog state changes


    // --- Stop Media Stream ---
   const stopMediaStream = useCallback(() => {
     console.log("Attempting to stop media stream...");
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
       console.log("Media stream stopped.");
     } else {
       console.log("No active media stream to stop.");
     }
     // Ensure video srcObject is cleared even if streamRef was already null
     if (videoRef.current && videoRef.current.srcObject) {
       videoRef.current.srcObject = null;
       console.log("Video source object cleared.");
     }
   }, []); // No dependencies needed

  // --- Stop Scan Interval ---
  const stopScanInterval = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      console.log("Scan interval stopped.");
    }
  }, []); // No dependencies needed


  // Define handleOpenChange *before* it's used as a dependency.
  const handleOpenChangeCallbackRef = useRef<(open: boolean) => void>();


  // --- Request Camera Permission & Start Stream ---
  const startCamera = useCallback(async () => {
     console.log("Attempting to start camera...");
     setScannerError(null);
     setScannerStatus('permission-pending'); // Indicate we are asking for permission

    // Ensure necessary APIs are available
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API (getUserMedia) not supported or available.');
        setScannerError('A API da câmera não é suportada neste navegador ou ambiente.');
        setScannerStatus('error');
        return;
    }


    try {
      // Try to get the environment-facing camera first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      console.log("Camera permission granted (environment facing).");
      streamRef.current = stream;

       if (videoRef.current) {
           // Apply mirror transform logic
           const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
           videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';

           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                setScannerStatus('initializing');
           } catch (playError) {
               console.error("Error trying to play video:", playError);
               setScannerError("Falha ao iniciar o vídeo da câmera.");
               setScannerStatus('error');
               stopMediaStream(); // Clean up stream if play failed
           }
       } else {
           console.warn("Video ref not available when stream was ready.");
           setScannerStatus('error');
           setScannerError('Falha ao configurar a visualização da câmera.');
           stopMediaStream(); // Cleanup stream if attachment failed
       }

    } catch (error) {
       console.warn('Error accessing environment camera, trying default:', error);
        // Fallback to default camera if environment fails
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default).");
            streamRef.current = stream;

            if (videoRef.current) {
                 // Apply mirror transform logic for default camera
                 const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
                 videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';

                videoRef.current.srcObject = stream;
                console.log("Video stream attached (default).");
                 try {
                    await videoRef.current.play();
                    console.log("Video play initiated (default).");
                    setScannerStatus('initializing');
                 } catch (playError) {
                    console.error("Error trying to play default video:", playError);
                    setScannerError("Falha ao iniciar o vídeo da câmera padrão.");
                    setScannerStatus('error');
                    stopMediaStream();
                 }
            } else {
               console.warn("Video ref not available when default stream was ready.");
               setScannerStatus('error');
               setScannerError('Falha ao configurar a visualização da câmera padrão.');
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
            setScannerError(errorMsg);
            setScannerStatus('permission-denied');
            toast({
                variant: 'destructive',
                title: 'Erro de Câmera',
                description: errorMsg,
            });
            stopMediaStream();
        }
    }
  }, [stopMediaStream, toast]); // Dependencies: cleanup func, toast


   // --- Start Scanning Interval ---
   const startScanning = useCallback(async () => {
      stopScanInterval(); // Stop any previous interval first
      console.log("Attempting to start scan interval...");

      if (!barcodeDetectorRef.current) {
         console.error("BarcodeDetector not available, cannot start scanning.");
         setScannerStatus('error');
         setScannerError('Leitor de QR code não inicializado ou não suportado.');
         stopMediaStream(); // Stop camera if scanner failed to initialize
         return;
      }

      // Check if video element is ready and playing
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !videoRef.current.srcObject || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0) {
          console.warn(`Video not ready/playing/attached for scanning. Status: ${scannerStatus}, Ref: ${!!videoRef.current}, Paused: ${videoRef.current?.paused}, Ended: ${videoRef.current?.ended}, SrcObj: ${!!videoRef.current?.srcObject}, ReadyState: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
           // If the video isn't ready, don't start the interval, just wait for events or try again.
           // Set status to initializing to potentially retry on video events.
           if (scannerStatus !== 'error' && scannerStatus !== 'permission-denied') {
               setScannerStatus('initializing');
           }
          return;
      }

     // Set status to scanning and start the interval
     setScannerStatus('scanning');
     console.log("Scanner status set to 'scanning'. Interval starting.");

     scanIntervalRef.current = setInterval(async () => {
          // Check again within the interval if scanning should continue
         if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !isDialogOpen || scannerStatus !== 'scanning' || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0) {
             console.log(`Scan interval tick skipped or stopping. Status: ${scannerStatus}, Dialog: ${isDialogOpen}, Video Paused: ${videoRef.current?.paused}, Ready: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
             stopScanInterval(); // Stop if conditions aren't met
             // Optionally reset status to allow restart if conditions change
             if (scannerStatus === 'scanning' && isDialogOpen && videoRef.current && videoRef.current.srcObject) {
                 setScannerStatus('initializing');
             }
             return;
         }

       try {
          if (!barcodeDetectorRef.current) {
              console.warn("BarcodeDetector became unavailable during scanning interval.");
              stopScanInterval();
              setScannerStatus('error');
              setScannerError('Leitor de QR code falhou durante o escaneamento.');
              return;
          }

          // Check if video element is still valid for detection
           if (!videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0) {
               console.warn("Video element not ready for detection within interval.");
               // Optionally stop and reset status
               // stopScanInterval();
               // setScannerStatus('initializing');
               return; // Skip this detection attempt
           }

          const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);

         if (barcodes.length > 0 && scannerStatus === 'scanning' && isDialogOpen) {
           const qrCodeData = barcodes[0].rawValue;
           console.log('QR Code detectado:', qrCodeData);

           // --- Verification Step ---
           stopScanInterval(); // Stop scanning first
           setScannerStatus('stopped'); // Keep video frame, indicate stopped

           toast({ title: 'QR Code Detectado!', description: `Verificando planta ${qrCodeData}...` });

           // Check for Firebase initialization errors before Firestore check
           if (firebaseInitializationError) {
               console.error("Firebase initialization error during QR verification:", firebaseInitializationError);
               toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível verificar a planta devido a erro do Firebase.' });
               setScannerStatus('error');
               setScannerError('Erro de configuração ao verificar planta.');
               return; // Stop the process
           }

           try {
             const plantExists = await getPlantById(qrCodeData); // Check Firestore
             if (plantExists) {
                 console.log(`Planta ${qrCodeData} encontrada no Firestore. Redirecionando...`);
                 sessionStorage.setItem('pendingNavigationQr', qrCodeData);
                 if (handleOpenChangeCallbackRef.current) {
                   console.log("Triggering dialog close via handleOpenChange(false) after QR verification.");
                   handleOpenChangeCallbackRef.current(false); // Close dialog and navigate
                 } else {
                    console.error("handleOpenChange callback ref not set when QR code verified!");
                    setIsDialogOpen(false); // Force close as fallback
                 }
             } else {
                 console.warn(`Planta ${qrCodeData} não encontrada no Firestore.`);
                 toast({
                     variant: 'destructive',
                     title: 'Planta Não Encontrada',
                     description: `O QR code ${qrCodeData} foi lido, mas a planta não existe no banco de dados.`,
                 });
                 // Keep dialog open, allow rescan
                 setScannerStatus('initializing'); // Go back to initializing to allow manual rescan/close
                 // Do not restart scanning automatically after not found
             }
           } catch (verificationError) {
               console.error(`Erro ao verificar planta ${qrCodeData}:`, verificationError);
               toast({
                   variant: 'destructive',
                   title: 'Erro na Verificação',
                   description: 'Não foi possível verificar a existência da planta. Tente novamente.',
               });
               setScannerStatus('error'); // Set to error on verification fail
               setScannerError('Erro ao verificar a planta no banco de dados.');
               // Do not restart scanning automatically after error
           }

         } else if (scannerStatus === 'scanning') {
            // Optional: Log if no barcode found on a scan tick
            // console.log("No barcode detected in this scan interval.");
         }
       } catch (error: any) {
         if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError' || error.name === 'OperationError')) {
             console.warn('DOMException during barcode detection (likely temporary/benign):', error.message);
             // Don't necessarily stop scanning for these, might be recoverable
         } else if (error.message && error.message.includes("video source is detached")) {
              console.warn("Video source detached error during detection. Stopping scan.", error);
              stopScanInterval();
              setScannerStatus('error');
              setScannerError('Fonte de vídeo desconectada.');
         } else {
             console.error('Erro durante a detecção do código de barras:', error);
             stopScanInterval(); // Stop scanning on other errors
             setScannerStatus('error');
             setScannerError('Falha ao detectar o código de barras.');
         }
       }
     }, 500); // Interval duration (adjust if needed, e.g., 300ms for faster scans)
     console.log("Scan interval setup complete.");
   }, [stopScanInterval, stopMediaStream, toast, isDialogOpen, scannerStatus]); // Added isDialogOpen and scannerStatus


  // --- Dialog Open/Close Handlers ---
   const handleDialogClose = useCallback(() => {
        console.log("Dialog closing intent received, performing cleanup...");
        stopScanInterval();
        stopMediaStream(); // Ensure stream is stopped
        setScannerStatus('idle'); // Reset status
        setScannerError(null);
        console.log("Dialog closed, status set to idle.");

        const qrCodeData = sessionStorage.getItem('pendingNavigationQr');
        if (qrCodeData) {
            console.log(`Found pending navigation for QR: ${qrCodeData}`);
            sessionStorage.removeItem('pendingNavigationQr'); // Clean up storage
            router.push(`/plant/${qrCodeData}`);
        } else {
            console.log("No pending navigation found during close.");
        }
   }, [stopMediaStream, stopScanInterval, router]);

   const handleDialogOpen = useCallback(() => {
        console.log(`Dialog opening intent received...`);
        // Prerequisite check moved to handleScanClick and useEffect for initial load
         // Prerequisite check
         if (!isScannerSupported || !barcodeDetectorRef.current) {
             const errorMsg = !isScannerSupported
                 ? 'O escaneamento de QR code não é suportado neste navegador.'
                 : 'Não foi possível inicializar o leitor de QR code. Tente recarregar a página.';
             console.error("Prerequisite check failed:", errorMsg);
             toast({
                 variant: 'destructive',
                 title: 'Erro de Compatibilidade',
                 description: errorMsg,
             });
             return; // Do not proceed if prerequisites fail
         }

        setScannerError(null);
        setScannerStatus('idle'); // Start as idle, camera starts, then initializing
        setIsDialogOpen(true); // Set dialog open state *before* starting camera
        startCamera(); // Initiate camera start
        console.log("Dialog state set to open, camera start initiated.");

   }, [startCamera, toast, isScannerSupported]); // Add toast and isScannerSupported dependency

    const handleOpenChange = useCallback((open: boolean) => {
       console.log(`handleOpenChange called with open: ${open}`);
       if (open) {
           handleDialogOpen();
       } else {
           // Only close if it's currently open
           if (isDialogOpen) {
               handleDialogClose();
               setIsDialogOpen(false); // Ensure state updates
           } else {
                console.log("handleOpenChange(false) called but dialog already closed.");
           }
       }
   }, [handleDialogOpen, handleDialogClose, isDialogOpen]);


   // Assign the stable callback to the ref for use in startScanning
   useEffect(() => {
       handleOpenChangeCallbackRef.current = handleOpenChange;
   }, [handleOpenChange]);


   // --- Effect to manage video events ---
   useEffect(() => {
     const videoElement = videoRef.current;
     if (!videoElement || !isDialogOpen) {
        // If dialog closes, ensure interval is stopped
        if(!isDialogOpen) stopScanInterval();
       return;
     }

     console.log("Effect: Attaching video event listeners.");

     const handleCanPlay = () => {
         console.log(`Video 'canplay' event. Status: ${scannerStatus}. ReadyState: ${videoElement.readyState}.`);
         // Only start scanning if initializing and ready
         if (scannerStatus === 'initializing' && videoElement.readyState >= videoElement.HAVE_METADATA && !scanIntervalRef.current) {
             console.log("Video can play, attempting scan start from 'canplay'.");
             startScanning();
         }
     };

     const handlePlaying = () => {
         console.log(`Video 'playing' event. Status: ${scannerStatus}. Interval Running: ${!!scanIntervalRef.current}`);
          // Only start scanning if initializing/scanning and ready, and not already scanning
         if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && videoElement.readyState >= videoElement.HAVE_METADATA) {
             console.log("Video is playing, attempting scan start from 'playing'.");
             startScanning();
         }
     };

     const handleLoadedMetadata = () => {
        console.log(`Video 'loadedmetadata' event. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}. Status: ${scannerStatus}`);
         // Only start scanning if initializing/scanning and ready, and not already scanning
        if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && !videoElement.paused && videoElement.readyState >= videoElement.HAVE_METADATA) {
           console.log("Metadata loaded, attempting scan start from 'loadedmetadata'.");
           startScanning();
        }
     };

     const handleError = (e: Event) => {
         console.error("Video element error event:", e);
         const error = videoElement.error;
         let errorMsg = "Ocorreu um erro com o vídeo da câmera.";
         if(error) {
            errorMsg = `Erro de vídeo: ${error.message} (código ${error.code})`;
         }
         setScannerError(errorMsg);
         setScannerStatus('error');
         stopMediaStream();
         stopScanInterval();
     };

     const handleWaiting = () => {
         console.warn("Video 'waiting' event. Playback stalled (buffering?).");
         // If scanning, stop and try to re-initialize
         if (scannerStatus === 'scanning') {
             console.log("Stopping scan interval due to video waiting.");
             stopScanInterval();
             setScannerStatus('initializing');
         }
     };


     videoElement.addEventListener('canplay', handleCanPlay);
     videoElement.addEventListener('playing', handlePlaying);
     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
     videoElement.addEventListener('error', handleError);
     videoElement.addEventListener('waiting', handleWaiting);


     // Initial check: If video is already ready and playing when listeners attach
     if (!videoElement.paused && videoElement.readyState >= videoElement.HAVE_METADATA && (scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current) {
         console.log("Effect: Video already playing on listener attach, attempting scan start.");
         startScanning();
     }


    return () => {
        if (videoElement) {
            console.log("Effect cleanup: Removing video event listeners.");
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('playing', handlePlaying);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('error', handleError);
            videoElement.removeEventListener('waiting', handleWaiting);
        }
        stopScanInterval(); // Ensure interval is stopped on cleanup
    };
  }, [isDialogOpen, scannerStatus, startScanning, stopMediaStream, stopScanInterval]);

  // Cleanup interval and stream on unmount
  useEffect(() => {
    return () => {
        // Check isMounted on cleanup to avoid running when not needed
        if (isMounted) {
            console.log("Dashboard component unmounting/cleaning up, stopping scan interval and media stream.");
            stopScanInterval();
            stopMediaStream();
        }
    };
  }, [isMounted, stopScanInterval, stopMediaStream]);


  // --- Button Click Handlers ---
  const handleScanClick = () => {
    console.log("Scan button clicked.");
    // Prerequisite check moved to handleDialogOpen, called by handleOpenChange
    // handleOpenChange will now call handleDialogOpen which includes the check
    handleOpenChange(true);
  };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
     router.push('/register-plant');
  };


  return (
    <TooltipProvider>
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-muted/5 to-primary/10 text-foreground">
      {/* Header Section */}
       <header className="mb-8">
         <div className="flex items-center gap-3 mb-1">
             <HomeIcon className="h-7 w-7 text-primary"/>
             <h1 className="text-3xl font-bold tracking-tight">Painel BuddyScan</h1> {/* Updated name */}
         </div>
         <p className="text-lg text-muted-foreground">Seu centro de controle de cultivo inteligente.</p>
       </header>

       {/* Display Global Error if Firebase Failed */}
        {firebaseInitializationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Erro Crítico de Configuração</AlertTitle>
            <AlertDescription>
              {firebaseInitializationError.message}. Algumas funcionalidades podem estar indisponíveis. Verifique o console para mais detalhes.
            </AlertDescription>
          </Alert>
        )}
        {/* Display General Fetch Error */}
        {error && !firebaseInitializationError && (
           <Alert variant="destructive" className="mb-6">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Dados</AlertTitle>
              <AlertDescription>
                 {error}
                 <Button onClick={fetchPlants} variant="secondary" size="sm" className="ml-4 button">
                     Tentar Novamente
                 </Button>
              </AlertDescription>
           </Alert>
        )}


      {/* Main Content Area - Grid Layout */}
       <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Left Column (Quick Actions & Attention) */}
          <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions Card */}
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 card border-primary/10">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle>
                   </div>
               </CardHeader>
               <CardContent className="grid grid-cols-1 gap-3 pt-2">
                 <Button
                   size="lg"
                   className="w-full text-base font-medium button justify-start"
                   onClick={handleRegister}
                   aria-label="Cadastrar Nova Planta"
                   disabled={isDialogOpen || !!firebaseInitializationError} // Disable if dialog open or Firebase error
                 >
                   <PlusCircle className="mr-3 h-5 w-5" />
                   Cadastrar Nova Planta
                 </Button>

                 <Tooltip>
                     <TooltipTrigger asChild>
                         {/* Wrap the button that might be disabled in a span for the tooltip to work */}
                         <span tabIndex={0} className={cn(!isScannerSupported && 'cursor-not-allowed')}>
                             <Button
                                size="lg"
                                variant="secondary"
                                className="w-full text-base font-medium button justify-start"
                                onClick={handleScanClick}
                                aria-label="Escanear QR Code da Planta"
                                disabled={isDialogOpen || !!firebaseInitializationError || !isScannerSupported} // Disable if dialog open, Firebase error, or scanner not supported
                             >
                               <ScanLine className="mr-3 h-5 w-5" />
                               Escanear QR Code
                             </Button>
                         </span>
                     </TooltipTrigger>
                      {!isScannerSupported && (
                          <TooltipContent side="bottom">
                             <p>Leitura de QR Code não suportada neste navegador.</p>
                          </TooltipContent>
                      )}
                 </Tooltip>


                 <Button
                   size="lg"
                   variant="outline"
                   className="w-full text-base font-medium button justify-start"
                   onClick={() => router.push('/plants')}
                   aria-label="Ver todas as plantas"
                   disabled={isDialogOpen || !!firebaseInitializationError} // Disable if dialog open or Firebase error
                 >
                   <Package className="mr-3 h-5 w-5" />
                   Ver Todas as Plantas
                 </Button>
               </CardContent>
             </Card>

              {/* Plants Needing Attention Card */}
              {isLoadingPlants ? (
                <Card className="shadow-md card border-destructive/30 p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-xl">Requer Atenção</CardTitle>
                   </div>
                   <div className="space-y-4">
                       <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
                       <p className="text-center text-muted-foreground text-sm">Carregando plantas...</p>
                   </div>
                </Card>
               ) : error ? ( // Show error state within the card if loading failed
                 <Card className="shadow-md card border-destructive/30 p-6">
                    <div className="flex items-center gap-2 mb-4">
                       <AlertTriangle className="h-5 w-5 text-destructive" />
                       <CardTitle className="text-xl">Requer Atenção</CardTitle>
                    </div>
                    <Alert variant="destructive" className="border-none p-0">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>Não foi possível carregar.</AlertDescription>
                    </Alert>
                 </Card>
                ) : ( // Show AttentionPlants only if no error and not loading
                 <AttentionPlants plants={attentionPlants} />
               )}


          </div>

           {/* Right Column (Recent Plants) */}
           <div className="lg:col-span-2">
              {isLoadingPlants ? (
                 <Card className="shadow-md card h-full flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Plantas Recentes</CardTitle>
                    </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                         <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                         <p className="text-center text-muted-foreground">Carregando plantas recentes...</p>
                     </div>
                 </Card>
              ) : error ? ( // Show error state within the card if loading failed
                  <Card className="shadow-md card h-full flex flex-col p-6">
                     <div className="flex items-center gap-2 mb-4">
                         <History className="h-5 w-5 text-primary" />
                         <CardTitle className="text-xl">Plantas Recentes</CardTitle>
                     </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                          <Alert variant="destructive" className="w-full">
                              <AlertCircleIcon className="h-4 w-4" />
                              <AlertTitle>Erro</AlertTitle>
                              <AlertDescription>Não foi possível carregar as plantas recentes.</AlertDescription>
                          </Alert>
                     </div>
                  </Card>
               ) : ( // Show RecentPlants only if no error and not loading
                 <RecentPlants plants={recentPlants} />
              )}
           </div>

       </main>

      {/* Scanner Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[550px] dialog-content border-primary/20 bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-primary">Escanear QR Code</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-1">
              Posicione o QR code da planta dentro da área demarcada.
            </DialogDescription>
          </DialogHeader>

          {/* Container for video and overlays */}
           <div className={cn(
                "relative mt-4 aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-lg bg-muted shadow-inner",
                "scanner-background-effect" // Add subtle background pattern
            )}>
              {/* Video element - Ensure playsInline */}
              <video
                  ref={videoRef}
                  className={cn(
                    `absolute inset-0 h-full w-full object-cover transition-opacity duration-500`,
                    {
                      'opacity-100': ['initializing', 'scanning', 'stopped'].includes(scannerStatus),
                      'opacity-0': !['initializing', 'scanning', 'stopped'].includes(scannerStatus),
                    }
                  )}
                  playsInline // Important for mobile inline playback
                  muted // Mute to avoid feedback loops and allow autoplay
                  style={{ transform: videoRef.current?.style.transform || 'scaleX(1)' }} // Persist transform
              />

             {/* Visual Guide Overlay */}
             {(scannerStatus === 'scanning' || scannerStatus === 'initializing' || scannerStatus === 'stopped') && ( // Show guide when camera is potentially active
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {/* Faded background effect */}
                     <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background/80"></div>
                      {/* Focus Box */}
                     <div className="relative w-[70%] h-[70%] border-2 border-primary/50 rounded-lg animate-pulse-border flex items-center justify-center overflow-hidden shadow-xl shadow-primary/20">
                         {/* Corner Highlights - Use pulse animation from globals.css */}
                         <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-accent animate-pulse-corners rounded-tl-md z-20"></div>
                         <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-accent animate-pulse-corners rounded-tr-md z-20"></div>
                         <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-accent animate-pulse-corners rounded-bl-md z-20"></div>
                         <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-accent animate-pulse-corners rounded-br-md z-20"></div>

                         {/* Removed Scan Line */}
                         {/* Removed Text inside focus box */}
                     </div>
                 </div>
             )}


             {/* Status Overlay (non-scanning states) */}
             {!['scanning', 'stopped'].includes(scannerStatus) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background/90 via-background/95 to-background/90 text-center p-4 rounded-lg z-10 transition-opacity duration-300">
                       {scannerStatus === 'permission-pending' && (
                         <>
                           <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                           <p className="text-lg font-semibold">Aguardando Permissão...</p>
                           <p className="text-muted-foreground text-sm mt-1">Solicitando acesso à câmera.</p>
                         </>
                       )}
                       {scannerStatus === 'initializing' && (
                           <>
                               <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                               <p className="text-lg font-semibold">Carregando Câmera...</p>
                               <p className="text-muted-foreground text-sm mt-1">Preparando o vídeo...</p>
                           </>
                       )}
                       {scannerStatus === 'idle' && (
                           <>
                               <Camera className="h-12 w-12 mb-4 text-muted-foreground" />
                               <p className="text-lg font-semibold text-muted-foreground">Pronto para escanear</p>
                               <p className="text-muted-foreground text-sm mt-1">A câmera será ativada.</p>
                           </>
                       )}
                       {scannerStatus === 'permission-denied' || (scannerStatus === 'error' && scannerError?.toLowerCase().includes('câmera')) && (
                         <>
                            {scannerStatus === 'permission-denied' ? (
                                <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                            ) : (
                                <Camera className="h-12 w-12 mb-4 text-destructive" />
                            )}
                           <p className="text-lg font-semibold text-destructive">
                               {scannerStatus === 'permission-denied' ? 'Acesso Negado' : 'Erro na Câmera'}
                           </p>
                           <p className="text-muted-foreground text-sm mt-1 px-4">
                             {scannerError || 'Não foi possível acessar a câmera.'}
                           </p>
                            {scannerStatus === 'permission-denied' && (
                               <Button variant="outline" size="sm" className="mt-4 button" onClick={startCamera}>
                                    Tentar Novamente
                               </Button>
                            )}
                         </>
                       )}
                       {scannerStatus === 'error' && scannerError && !scannerError?.toLowerCase().includes('câmera') && (
                          <>
                            <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                             <p className="text-lg font-semibold text-destructive">Erro no Leitor</p>
                            <p className="text-muted-foreground text-sm mt-1 px-4">
                                {scannerError}
                            </p>
                             <Button variant="outline" size="sm" className="mt-4 button" onClick={() => handleOpenChange(false)}>
                                 Fechar
                             </Button>
                          </>
                       )}
                  </div>
             )}
          </div>


          <DialogFooter className="mt-6 sm:justify-center">
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="button w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
     </TooltipProvider>
  );
}
