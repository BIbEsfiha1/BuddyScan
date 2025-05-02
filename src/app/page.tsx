
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History, AlertCircle as AlertCircleIcon, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RecentPlants from '@/components/dashboard/recent-plants';
import AttentionPlants from '@/components/dashboard/attention-plants';
import { Separator } from '@/components/ui/separator';
import type { Plant } from '@/services/plant-id'; // Import Plant type
import { getRecentPlants, getAttentionPlants } from '@/services/plant-id'; // Import fetch functions


// Define states for camera/scanner
type ScannerStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'initializing' | 'scanning' | 'error' | 'stopped';

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any | null>(null); // Using any for BarcodeDetector due to type issues
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  // State for fetched plant data
  const [recentPlants, setRecentPlants] = useState<Plant[]>([]);
  const [attentionPlants, setAttentionPlants] = useState<Plant[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);


  // Track mount state
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);


  // Initialize BarcodeDetector only once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window && !barcodeDetectorRef.current) {
      try {
        // @ts-ignore - Suppress type checking for experimental API
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        console.log('BarcodeDetector initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize BarcodeDetector:', error);
        // Don't set state immediately, let user trigger scan first
      }
    } else if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) {
        console.warn('BarcodeDetector API not supported in this browser.');
        // Don't set state immediately
    }
  }, []); // Empty dependency array ensures this runs only once


   // --- Fetch Plant Data Function ---
   const fetchPlants = useCallback(async () => {
     console.log("Fetching plant data from service...");
     setIsLoadingPlants(true);
     try {
       // Use the persistent service functions
       const [fetchedRecent, fetchedAttention] = await Promise.all([
         getRecentPlants(3), // Fetch 3 recent plants
         getAttentionPlants(3) // Fetch 3 attention plants
       ]);
       console.log("Fetched recent plants:", fetchedRecent);
       console.log("Fetched attention plants:", fetchedAttention);
       setRecentPlants(fetchedRecent);
       setAttentionPlants(fetchedAttention);
     } catch (error) {
       console.error('Failed to fetch plant data:', error);
       toast({
         variant: 'destructive',
         title: 'Erro ao Carregar Dados',
         description: 'Não foi possível buscar os dados das plantas do armazenamento local.',
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


  // Cleanup interval and stream on unmount
   useEffect(() => {
    return () => {
      // Check isMounted on cleanup to avoid running when not needed
      if (isMounted) {
        console.log("Home component unmounting/cleaning up, stopping scan interval and media stream.");
        stopScanInterval();
        stopMediaStream();
      }
    };
   }, [isMounted, stopScanInterval, stopMediaStream]);


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
           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                // IMPORTANT: Move status to initializing AFTER play() promise resolves
                // This ensures the video events ('playing', 'canplay') might fire correctly
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

  // Define handleOpenChange *before* it's used as a dependency.
  // Use placeholder for close logic initially, then refine.
  const handleOpenChangeCallbackRef = useRef<(open: boolean) => void>();

   // --- Start Scanning Interval ---
   const startScanning = useCallback(() => {
      stopScanInterval(); // Clear any existing interval first
      console.log("Attempting to start scan interval...");

      if (!barcodeDetectorRef.current) {
         console.error("BarcodeDetector not available, cannot start scanning.");
         setScannerStatus('error');
         setScannerError('Leitor de QR code não inicializado ou não suportado.');
         stopMediaStream();
         return;
      }

      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !videoRef.current.srcObject || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA || videoRef.current.videoWidth === 0) {
          console.warn(`Video not ready/playing/attached for scanning. Status: ${scannerStatus}, Ref: ${!!videoRef.current}, Paused: ${videoRef.current?.paused}, Ended: ${videoRef.current?.ended}, SrcObj: ${!!videoRef.current?.srcObject}, ReadyState: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
          // Don't immediately set to error, let video events potentially trigger it again.
          // Consider setting a timeout to try again briefly?
          // If status is already 'scanning', maybe set back to 'initializing'?
           if (scannerStatus === 'scanning') {
               console.log("Scan attempt failed while status was 'scanning', resetting to 'initializing'.");
               setScannerStatus('initializing'); // Revert to initializing if scan failed immediately
           }
          return; // Don't start interval if video isn't ready
      }

     setScannerStatus('scanning');
     console.log("Scanner status set to 'scanning'. Interval starting.");

     scanIntervalRef.current = setInterval(async () => {
         // Check conditions *inside* interval for robustness
         if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !isDialogOpen || scannerStatus !== 'scanning' || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA || videoRef.current.videoWidth === 0) {
             console.log(`Scan interval tick skipped or stopping. Status: ${scannerStatus}, Dialog: ${isDialogOpen}, Video Paused: ${videoRef.current?.paused}, Ready: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
             stopScanInterval(); // Stop if conditions are no longer met
             // Don't automatically stop the stream here, maybe let the close handler do it
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

          // console.log("Attempting barcode detection..."); // Reduce log noise
          const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
          // console.log(`Detection result: ${barcodes.length} barcode(s) found.`); // Reduce log noise

         if (barcodes.length > 0 && scannerStatus === 'scanning' && isDialogOpen) { // Double check status and dialog open
           const qrCodeData = barcodes[0].rawValue;
           console.log('QR Code detectado:', qrCodeData);

           stopScanInterval(); // Stop scanning interval first
           setScannerStatus('stopped'); // Indicate scanning stopped successfully (keeps video frame)

           toast({ title: 'QR Code Detectado!', description: `Redirecionando para planta ${qrCodeData}...` });

           // Use sessionStorage to pass data before navigation
           sessionStorage.setItem('pendingNavigationQr', qrCodeData);
           // Call handleOpenChange(false) to trigger close and navigation
           if (handleOpenChangeCallbackRef.current) {
             console.log("Triggering dialog close via handleOpenChange(false) after QR detection.");
             handleOpenChangeCallbackRef.current(false);
           } else {
              console.error("handleOpenChange callback ref not set when QR code detected!");
              // Fallback? Close manually?
              setIsDialogOpen(false); // Force close if callback is missing
              // router.push(`/plant/${qrCodeData}`); // Manually navigate? Risky.
           }

         }
       } catch (error: any) {
         // Ignore detection errors if they are DOMExceptions (can happen during stream transitions)
         if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError' || error.name === 'OperationError')) {
             console.warn('DOMException during barcode detection (likely temporary/benign):', error.message);
         } else {
             console.error('Erro durante a detecção do código de barras:', error);
             // More cautious error handling - maybe don't stop everything?
             // Consider logging without stopping if errors are frequent but temporary
             // stopScanInterval();
             // setScannerStatus('error');
             // setScannerError(`Falha ao escanear QR code: ${error.message || 'Erro desconhecido'}`);
         }
       }
     }, 500); // Slightly faster scan interval, adjust as needed
     console.log("Scan interval setup complete.");
   }, [stopScanInterval, stopMediaStream, toast, scannerStatus, isDialogOpen]); // Remove handleOpenChange from deps for now, use ref


  // --- Dialog Open/Close Handlers ---
   const handleDialogClose = useCallback(() => {
        console.log("Dialog closing intent received, performing cleanup...");
        stopScanInterval();
        stopMediaStream(); // Ensure stream is stopped
        setScannerStatus('idle'); // Reset status
        setScannerError(null);
        console.log("Dialog closed, status set to idle.");

        // If navigation is pending due to QR code scan
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
        // Check prerequisites before attempting to start camera
        if (typeof window === 'undefined' || !('BarcodeDetector' in window) || !window.BarcodeDetector || !barcodeDetectorRef.current) {
            const errorMsg = typeof window === 'undefined' || !('BarcodeDetector' in window) || !window.BarcodeDetector
                ? 'O escaneamento de QR code não é suportado neste navegador.'
                : 'Não foi possível inicializar o leitor de QR code. Tente recarregar a página.';
            console.error("Prerequisite check failed:", errorMsg);
            toast({
                variant: 'destructive',
                title: 'Erro de Compatibilidade',
                description: errorMsg,
            });
            // Don't open the dialog if prerequisites fail
            setIsDialogOpen(false); // Ensure it stays closed
            return;
        }

        // Reset state and start camera flow
        setScannerError(null);
        setScannerStatus('idle'); // Start from idle before trying to open
        setIsDialogOpen(true); // Open the dialog first
        // Delay camera start slightly to allow dialog animation? May not be needed.
        // setTimeout(() => startCamera(), 50);
        startCamera(); // Attempt to start the camera immediately
        console.log("Dialog state set to open, camera start initiated.");

   }, [startCamera, toast]);

    // Define handleOpenChange *after* the handlers it depends on.
    // Use useCallback to ensure stable reference.
    const handleOpenChange = useCallback((open: boolean) => {
       console.log(`handleOpenChange called with open: ${open}`);
       if (open) {
           handleDialogOpen();
       } else {
           // Only handle close if dialog is actually open
           // This prevents infinite loops if called multiple times
           if (isDialogOpen) {
               handleDialogClose();
               setIsDialogOpen(false); // Update state *after* cleanup
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
   // This effect focuses on reacting to video state changes to trigger scanning reliably
   useEffect(() => {
     const videoElement = videoRef.current;

     // Only attach listeners if the dialog is open and video ref exists
     if (!videoElement || !isDialogOpen) {
       return;
     }

     console.log("Effect: Attaching video event listeners.");

     const handleCanPlay = () => {
         console.log(`Video 'canplay' event. Status: ${scannerStatus}. ReadyState: ${videoElement.readyState}.`);
         // If initializing and ready, try scanning. Might be redundant with 'playing'.
         if (scannerStatus === 'initializing' && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && !scanIntervalRef.current) {
             console.log("Video can play, attempting scan start from 'canplay'.");
             startScanning();
         }
     };

     const handlePlaying = () => {
         console.log(`Video 'playing' event. Status: ${scannerStatus}. Interval Running: ${!!scanIntervalRef.current}`);
          // Main trigger for scanning: If initializing or scanning (and interval isn't running yet)
         if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current) {
             console.log("Video is playing, attempting scan start from 'playing'.");
             startScanning();
         }
     };

     const handleLoadedMetadata = () => {
        console.log(`Video 'loadedmetadata' event. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}. Status: ${scannerStatus}`);
        // Useful if dimensions weren't available initially. Attempt scan if conditions met.
        if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && !videoElement.paused && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
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
         // If actively scanning, maybe stop the interval temporarily?
         if (scannerStatus === 'scanning') {
             console.log("Stopping scan interval due to video waiting.");
             stopScanInterval();
             // Consider setting status back to 'initializing'?
             setScannerStatus('initializing');
         }
     };


     videoElement.addEventListener('canplay', handleCanPlay);
     videoElement.addEventListener('playing', handlePlaying);
     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
     videoElement.addEventListener('error', handleError);
     videoElement.addEventListener('waiting', handleWaiting); // Listen for stalling


     // Initial check in case video is *already* playing when effect attaches
     if (!videoElement.paused && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && (scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current) {
         console.log("Effect: Video already playing on listener attach, attempting scan start.");
         startScanning();
     }


    return () => {
        // Cleanup: Remove event listeners when dialog closes or component unmounts
        if (videoElement) {
            console.log("Effect cleanup: Removing video event listeners.");
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('playing', handlePlaying);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('error', handleError);
            videoElement.removeEventListener('waiting', handleWaiting);
        }
        // Also ensure interval is stopped on cleanup
        stopScanInterval();
    };
   // Dependencies: Status, dialog state, the scanning function, and cleanup functions
  }, [isDialogOpen, scannerStatus, startScanning, stopMediaStream, stopScanInterval]);


  // --- Button Click Handlers ---
  const handleScanClick = () => {
    console.log("Scan button clicked.");
    handleOpenChange(true); // Trigger dialog opening flow using the defined handler
  };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
     router.push('/register-plant'); // Navigate to the register page
  };


  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5 text-foreground">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-10 w-10 text-primary animate-pulse duration-3000" />
            <h1 className="text-4xl font-bold text-primary tracking-tight drop-shadow-sm">CannaLog</h1>
        </div>
        <p className="text-lg text-muted-foreground">Seu painel de controle de cultivo inteligente.</p>
      </header>

      {/* Main Content Area - Grid Layout */}
       <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Left Column (Quick Actions & Attention) */}
          <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions Card */}
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 card border border-primary/10">
               <CardHeader>
                 <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col gap-3">
                 <Button
                   size="lg"
                   className="w-full text-lg font-semibold button justify-start"
                   onClick={handleRegister}
                   aria-label="Cadastrar Nova Planta"
                   disabled={isDialogOpen}
                 >
                   <PlusCircle className="mr-3 h-5 w-5" />
                   Cadastrar Planta
                 </Button>
                 <Button
                   size="lg"
                   variant="secondary"
                   className="w-full text-lg font-semibold button justify-start"
                   onClick={handleScanClick}
                   aria-label="Escanear QR Code da Planta"
                   disabled={isDialogOpen}
                 >
                   <ScanLine className="mr-3 h-5 w-5" />
                   Escanear QR Code
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
               ) : (
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
              ) : (
                 <RecentPlants plants={recentPlants} />
              )}
           </div>

       </main>

      {/* Scanner Dialog */}
      {/* Use controlled Dialog component */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[550px] dialog-content border-primary/20 bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-primary">Escanear QR Code</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-1">
              Posicione o QR code da planta dentro da área demarcada.
            </DialogDescription>
          </DialogHeader>

          {/* Container for video and overlays */}
           <div className="relative mt-4 aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-lg bg-muted shadow-inner">
              {/* Video element - Always render, but control visibility/opacity based on status */}
              <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                      ['initializing', 'scanning', 'stopped'].includes(scannerStatus) ? 'opacity-100' : 'opacity-0'
                  }`}
                  playsInline // Essential for iOS Safari
                  muted // Required for autoplay in most browsers
                  // Ensure transform doesn't interfere with detection
              />

             {/* Visual Guide Overlay - Show ONLY when scanning or actively initializing */}
             {(scannerStatus === 'scanning' || scannerStatus === 'initializing') && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     {/* Outer Mask for focus effect (subtle vignette) */}
                     <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/70 to-background/90"></div>

                     {/* Focus Box with Pulsing Border */}
                     <div className="relative w-[70%] h-[70%] border-2 border-primary/50 rounded-lg animate-pulse-border flex items-center justify-center overflow-hidden">
                         {/* Pulsing Corner Brackets (more prominent) */}
                         <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-accent animate-pulse rounded-tl-md z-20"></div>
                         <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-accent animate-pulse rounded-tr-md z-20"></div>
                         <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-accent animate-pulse rounded-bl-md z-20"></div>
                         <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-accent animate-pulse rounded-br-md z-20"></div>

                         {/* Animated Scan Line (only when actively scanning) */}
                         {scannerStatus === 'scanning' && (
                           // Apply the animation class directly to a self-closing div
                           <div className="absolute bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_10px_1px_hsl(var(--accent)/0.6)] rounded-full animate-scan-line-vertical"/>
                         )}
                     </div>
                 </div>
             )}


             {/* Status Overlay (Loading, Permission Denied, Error) - Show when NOT scanning/stopped/idle */}
             {/* Simplified condition: Show overlay unless actively scanning or successfully stopped */}
             {!['scanning', 'stopped'].includes(scannerStatus) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background/90 via-background/95 to-background/90 text-center p-4 rounded-lg z-10 transition-opacity duration-300">
                       {/* Permission Pending State */}
                       {scannerStatus === 'permission-pending' && (
                         <>
                           <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                           <p className="text-lg font-semibold">Aguardando Permissão...</p>
                           <p className="text-muted-foreground text-sm mt-1">Solicitando acesso à câmera.</p>
                         </>
                       )}
                       {/* Initializing State (Covers period before 'playing' or 'canplay') */}
                       {scannerStatus === 'initializing' && (
                           <>
                               <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                               <p className="text-lg font-semibold">Carregando Câmera...</p>
                               <p className="text-muted-foreground text-sm mt-1">Preparando o vídeo...</p>
                           </>
                       )}
                       {/* Idle State (Before anything happens) */}
                       {scannerStatus === 'idle' && (
                           <>
                               <Camera className="h-12 w-12 mb-4 text-muted-foreground" />
                               <p className="text-lg font-semibold text-muted-foreground">Pronto para escanear</p>
                               <p className="text-muted-foreground text-sm mt-1">A câmera será ativada.</p>
                           </>
                       )}
                       {/* Permission Denied or Camera Error State */}
                       {scannerStatus === 'permission-denied' || (scannerStatus === 'error' && scannerError?.toLowerCase().includes('câmera')) && (
                         <>
                            {scannerStatus === 'permission-denied' ? (
                                <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                            ) : (
                                <Camera className="h-12 w-12 mb-4 text-destructive" /> // Keep camera icon for general camera errors
                            )}
                           <p className="text-lg font-semibold text-destructive">
                               {scannerStatus === 'permission-denied' ? 'Acesso Negado' : 'Erro na Câmera'}
                           </p>
                           <p className="text-muted-foreground text-sm mt-1 px-4">
                             {scannerError || 'Não foi possível acessar a câmera.'}
                           </p>
                           {/* Show "Try Again" only for permission denied */}
                            {scannerStatus === 'permission-denied' && (
                               <Button variant="outline" size="sm" className="mt-4 button" onClick={startCamera}>
                                    Tentar Novamente
                               </Button>
                            )}
                         </>
                       )}
                       {/* General Scanner Error State (non-camera related, e.g., detector failure) */}
                       {scannerStatus === 'error' && scannerError && !scannerError?.toLowerCase().includes('câmera') && (
                          <>
                            <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                             <p className="text-lg font-semibold text-destructive">Erro no Leitor</p>
                            <p className="text-muted-foreground text-sm mt-1 px-4">
                                {scannerError}
                            </p>
                            {/* Let user close on general errors */}
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
  );
}
