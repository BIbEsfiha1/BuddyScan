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
    if ('BarcodeDetector' in window && !barcodeDetectorRef.current) {
      try {
        // @ts-ignore - Suppress type checking for experimental API
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        console.log('BarcodeDetector initialized');
      } catch (error) {
        console.error('Failed to initialize BarcodeDetector:', error);
        // Don't set state immediately, let user trigger scan first
      }
    } else if (!('BarcodeDetector' in window)) {
        console.warn('BarcodeDetector API not supported.');
        // Don't set state immediately
    }
  }, []); // Empty dependency array ensures this runs only once


  // Fetch plant data on mount
  useEffect(() => {
    const fetchPlants = async () => {
      setIsLoadingPlants(true);
      try {
        const [fetchedRecent, fetchedAttention] = await Promise.all([
          getRecentPlants(3), // Fetch 3 recent plants
          getAttentionPlants(3) // Fetch 3 attention plants
        ]);
        setRecentPlants(fetchedRecent);
        setAttentionPlants(fetchedAttention);
      } catch (error) {
        console.error('Failed to fetch plant data:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Carregar Dados',
          description: 'Não foi possível buscar os dados das plantas.',
        });
      } finally {
        setIsLoadingPlants(false);
      }
    };

    if (isMounted) {
       fetchPlants();
    }
  }, [isMounted, toast]);


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

    try {
      // Try to get the environment-facing camera first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
      console.log("Camera permission granted (environment facing).");
      streamRef.current = stream;

       if (videoRef.current) {
           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                setScannerStatus('initializing'); // Move to initializing only after play starts
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


   // --- Dialog Open/Close Handlers (Defined before startScanning which depends on handleOpenChange) ---
   const handleDialogClose = useCallback(() => {
        console.log("Dialog closing, performing cleanup...");
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
            console.log("No pending navigation found.");
        }
   }, [stopMediaStream, stopScanInterval, router]); // handleOpenChange removed as dependency

   const handleDialogOpen = useCallback(() => {
        console.log(`Dialog opening...`);
        // Check prerequisites before attempting to start camera
        if (!('BarcodeDetector' in window) || !window.BarcodeDetector || !barcodeDetectorRef.current) {
            const errorMsg = !('BarcodeDetector' in window) || !window.BarcodeDetector
                ? 'O escaneamento de QR code não é suportado neste navegador.'
                : 'Não foi possível inicializar o leitor de QR code. Tente recarregar a página.';
            console.error("Prerequisite check failed:", errorMsg);
            toast({
                variant: 'destructive',
                title: 'Erro de Pré-requisito',
                description: errorMsg,
            });
            // Don't open the dialog if prerequisites fail
            setIsDialogOpen(false); // Ensure it stays closed
            return;
        }

        // Reset state and start camera flow
        setScannerError(null);
        setIsDialogOpen(true); // Open the dialog first
        startCamera(); // Then attempt to start the camera
        console.log("Dialog opened, camera start initiated.");

   }, [startCamera, toast]); // handleOpenChange removed as dependency

    // handleOpenChange is defined here, using handleDialogOpen and handleDialogClose
    const handleOpenChange = useCallback((open: boolean) => {
       console.log(`handleOpenChange called with open: ${open}`);
       if (open) {
           handleDialogOpen();
       } else {
           // Only handle close if dialog is actually open
           if (isDialogOpen) {
               handleDialogClose();
           }
           setIsDialogOpen(false); // Ensure state reflects closed regardless
       }
   }, [handleDialogOpen, handleDialogClose, isDialogOpen]); // Depends on handlers defined above


  // --- Start Scanning Interval (Defined AFTER handleOpenChange) ---
  const startScanning = useCallback(() => {
     stopScanInterval(); // Clear any existing interval first
     console.log("Starting scan interval...");

     if (!barcodeDetectorRef.current) {
        console.error("BarcodeDetector not available for scanning.");
        setScannerStatus('error');
        setScannerError('Leitor de QR code não está pronto.');
        stopMediaStream(); // Stop camera if detector failed
        return;
     }
     if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !videoRef.current.srcObject) {
         console.warn(`Video not ready/playing/attached, cannot start scan. Status: ${scannerStatus}, Paused: ${videoRef.current?.paused}, Ended: ${videoRef.current?.ended}, SrcObject: ${!!videoRef.current?.srcObject}`);
         setScannerStatus('error');
         setScannerError('Falha ao iniciar a câmera para escaneamento.');
         stopMediaStream();
         return;
     }

    setScannerStatus('scanning');
    console.log("Scanner status set to 'scanning'.");

    scanIntervalRef.current = setInterval(async () => {
        // Check conditions inside interval
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !isDialogOpen || scannerStatus !== 'scanning') {
            console.log(`Scan interval tick skipped or stopping: Status: ${scannerStatus}, Dialog Open: ${isDialogOpen}, Video Paused: ${videoRef.current?.paused}`);
            stopScanInterval();
            return;
        }

      try {
         if (!barcodeDetectorRef.current) {
             console.warn("BarcodeDetector became unavailable during scanning.");
             stopScanInterval();
             setScannerStatus('error');
             setScannerError('Leitor de QR code falhou durante o escaneamento.');
             return;
         }

         // Check if video has dimensions before detecting
         if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            console.log("Video dimensions not yet available, skipping detect call.");
            return; // Wait for video to have dimensions
         }

        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);

        if (barcodes.length > 0 && scannerStatus === 'scanning' && isDialogOpen) { // Double check status and dialog open
          const qrCodeData = barcodes[0].rawValue;
          console.log('QR Code detectado:', qrCodeData);

          stopScanInterval(); // Stop scanning interval first
          setScannerStatus('stopped'); // Indicate scanning stopped successfully (keeps video frame)

          toast({ title: 'QR Code Detectado!', description: `Redirecionando para planta ${qrCodeData}...` });

          // Use sessionStorage to pass data before navigation
          sessionStorage.setItem('pendingNavigationQr', qrCodeData);
          handleOpenChange(false); // Trigger dialog close, which handles cleanup and navigation

        }
      } catch (error: any) {
        // Ignore detection errors if they are DOMExceptions (can happen during stream transitions)
        if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError')) {
            console.warn('DOMException during barcode detection:', error.message);
        } else {
            console.error('Erro durante a detecção do código de barras:', error);
             // Consider logging without stopping if errors are frequent but temporary
             // stopScanInterval();
             // setScannerStatus('error');
             // setScannerError(`Falha ao escanear QR code: ${error.message || 'Erro desconhecido'}`);
        }
      }
    }, 700); // Increased scan interval slightly
    console.log("Scan interval setup complete.");
  }, [stopScanInterval, stopMediaStream, toast, scannerStatus, isDialogOpen, handleOpenChange]); // handleOpenChange is now defined


   // --- Effect to manage video events ---
  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !isDialogOpen || (scannerStatus !== 'initializing' && scannerStatus !== 'scanning')) {
      return; // Only run if dialog is open and status is initializing/scanning
    }

    console.log("Effect: Adding video event listeners.");

    const handleCanPlay = () => {
        console.log("Video 'canplay' event fired.");
        // Attempt to start scanning ONLY if initializing and video is playing
        if (scannerStatus === 'initializing' && !videoElement.paused && isDialogOpen) {
            console.log("Video can play and status is initializing, starting scan interval.");
            startScanning();
        } else {
            console.warn(`Video can play, but conditions not met. Status: ${scannerStatus}, Paused: ${videoElement.paused}, Dialog: ${isDialogOpen}. Scan not started from 'canplay'.`);
        }
    };

    const handlePlaying = () => {
        console.log("Video 'playing' event fired.");
         // Confirm playback has started, good place to ensure scanning starts
         if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && isDialogOpen) {
             console.log("Video is playing, attempting to start scan interval (if not already running).");
             startScanning();
         } else {
             console.log(`Video playing, but status (${scannerStatus}) or existing interval (${!!scanIntervalRef.current}) prevents starting scan.`);
         }
    };

     const handleLoadedMetadata = () => {
        console.log(`Video metadata loaded: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        // Sometimes needed to ensure dimensions are available before scanning
        // Might trigger scanning if 'playing' hasn't fired reliably
        if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && !videoElement.paused && isDialogOpen) {
           console.log("Metadata loaded, attempting scan start.");
           startScanning();
        }
     };


    const handleError = (e: Event) => {
        console.error("Video element error:", e);
        setScannerError("Ocorreu um erro com o vídeo da câmera.");
        setScannerStatus('error');
        stopMediaStream();
        stopScanInterval();
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata); // Added listener
    videoElement.addEventListener('error', handleError);

    // Initial check in case video is already playing when effect runs
    if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && !videoElement.paused && (scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && isDialogOpen) {
        console.log("Effect: Video already playable/playing on listener attach, attempting scan start.");
        startScanning();
    }


    return () => {
        // Cleanup: Remove event listeners
        if (videoElement) {
            console.log("Effect cleanup: Removing video event listeners.");
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('playing', handlePlaying);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('error', handleError);
        }
    };
    // Dependencies: Status, dialog state, startScanning function, cleanup functions
  }, [scannerStatus, isDialogOpen, startScanning, stopMediaStream, stopScanInterval]);


  // --- Button Click Handlers ---
  const handleScanClick = () => {
    console.log("Scan button clicked.");
    handleOpenChange(true); // Trigger dialog opening flow using the defined handler
  };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
    // toast({
    //   title: 'Funcionalidade Indisponível',
    //   description: 'A página de cadastro de plantas ainda não foi implementada.',
    //   variant: 'default',
    // });
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
                 <AttentionPlants plants={attentionPlants.map(p => ({ // Map Plant to AttentionPlantSummary
                     id: p.id,
                     qrCode: p.qrCode,
                     strain: p.strain,
                     status: p.status,
                     // Mock reason - replace with actual logic if available
                     attentionReason: p.qrCode === 'plantABC' ? 'Deficiência de Nitrogênio' : p.qrCode === 'plantDEF' ? 'Umidade Alta Detectada' : 'Ácaros Aranha',
                     // Mock last updated - replace with actual data if available
                     lastUpdated: p.qrCode === 'plantDEF' ? 'Hoje' : 'Alguns dias atrás',
                     // Use a placeholder image logic similar to RecentPlants
                     photoUrl: `https://picsum.photos/seed/cannabis-${p.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-problem/100/100`
                 }))} />
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
                 <RecentPlants plants={recentPlants.map(p => ({ // Map Plant to PlantSummary
                      id: p.id,
                      qrCode: p.qrCode,
                      strain: p.strain,
                      status: p.status,
                      // Mock last updated - replace with actual data if available
                      lastUpdated: 'Recentemente',
                      photoUrl: `https://picsum.photos/seed/cannabis-${p.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/100/100`
                  }))} />
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
          <div className="relative mt-4 aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-lg border-2 border-primary/30 bg-muted shadow-inner">
            {/* Video element - Always render */}
            <video
              ref={videoRef}
              // Keep mirrored for natural user experience
              className={`absolute inset-0 h-full w-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${scannerStatus === 'scanning' || scannerStatus === 'initializing' || scannerStatus === 'stopped' ? 'opacity-100' : 'opacity-0'}`}
              playsInline // Essential for iOS Safari
              muted // Required for autoplay in most browsers
            />

             {/* Visual Guide Overlay - Show ONLY when scanning or initializing */}
             {(scannerStatus === 'scanning' || scannerStatus === 'initializing') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Faded Mask for focus effect */}
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/60 to-background/80"></div>

                    {/* Focus Box */}
                    <div className="relative w-[70%] h-[70%] border-4 border-dashed border-primary/50 rounded-lg shadow-[0_0_30px_10px_hsl(var(--background)/0.5)] flex items-center justify-center">
                      {/* Optional: Inner Crosshair or Lines */}
                      {/* <div className="absolute w-1/2 h-[2px] bg-primary/30 top-1/2 left-1/4 -translate-y-1/2"></div>
                      <div className="absolute h-1/2 w-[2px] bg-primary/30 left-1/2 top-1/4 -translate-x-1/2"></div> */}
                       {/* Pulsing Corner Brackets for focus */}
                        <div className="absolute top-[-4px] left-[-4px] w-8 h-8 border-t-4 border-l-4 border-accent animate-pulse rounded-tl-lg"></div>
                        <div className="absolute top-[-4px] right-[-4px] w-8 h-8 border-t-4 border-r-4 border-accent animate-pulse rounded-tr-lg"></div>
                        <div className="absolute bottom-[-4px] left-[-4px] w-8 h-8 border-b-4 border-l-4 border-accent animate-pulse rounded-bl-lg"></div>
                        <div className="absolute bottom-[-4px] right-[-4px] w-8 h-8 border-b-4 border-r-4 border-accent animate-pulse rounded-br-lg"></div>
                    </div>


                    {/* Animated Scan Line (only when actively scanning) */}
                    {scannerStatus === 'scanning' && (
                       <div className="absolute w-[70%] h-1.5 bg-gradient-to-r from-transparent via-accent/80 to-transparent animate-scan-line-vertical shadow-[0_0_15px_2px_hsl(var(--accent)/0.5)] rounded-full"></div>
                    )}
                </div>
             )}

             {/* Status Overlay (Loading, Permission Denied, Error) - Show when NOT scanning/stopped/idle */}
             {scannerStatus !== 'scanning' && scannerStatus !== 'stopped' && scannerStatus !== 'idle' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background/90 via-background/95 to-background/90 text-center p-4 rounded-lg z-10 transition-opacity duration-300">
                       {/* Permission Pending State */}
                       {scannerStatus === 'permission-pending' && (
                         <>
                           <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                           <p className="text-lg font-semibold">Aguardando Permissão...</p>
                           <p className="text-muted-foreground text-sm mt-1">Solicitando acesso à câmera.</p>
                         </>
                       )}
                       {/* Initializing State */}
                       {scannerStatus === 'initializing' && (
                           <>
                               <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                               <p className="text-lg font-semibold">Carregando Câmera...</p>
                               <p className="text-muted-foreground text-sm mt-1">Preparando o vídeo...</p>
                           </>
                       )}
                       {/* Permission Denied or Camera Error State */}
                       {(scannerStatus === 'permission-denied' || (scannerStatus === 'error' && scannerError?.toLowerCase().includes('câmera'))) && (
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
                       {/* General Scanner Error State (non-camera related) */}
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
  );
}
