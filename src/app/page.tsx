'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History, AlertCircle as AlertCircleIcon } from 'lucide-react';
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

// Mock Data
const mockRecentPlants = [
    { id: 'plant123', qrCode: 'plant123', strain: 'Variedade Exemplo', status: 'Vegetativo', lastUpdated: 'Ontem', photoUrl: 'https://picsum.photos/seed/cannabis-veg-healthy-day1/100/100' },
    { id: 'plant456', qrCode: 'plant456', strain: 'Purple Haze', status: 'Floração', lastUpdated: '2 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-flowering-early/100/100' },
    { id: 'plant789', qrCode: 'plant789', strain: 'Sour Diesel', status: 'Secagem', lastUpdated: '5 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-drying-buds/100/100' },
];

const mockAttentionPlants = [
    { id: 'plantABC', qrCode: 'plantABC', strain: 'Cepa Problema', status: 'Vegetativo', attentionReason: 'Deficiência de Nitrogênio', lastUpdated: '3 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-nitrogen-deficiency/100/100' },
    { id: 'plantDEF', qrCode: 'plantDEF', strain: 'White Widow', status: 'Floração', attentionReason: 'Umidade Alta Detectada', lastUpdated: 'Hoje', photoUrl: 'https://picsum.photos/seed/cannabis-high-humidity-mold/100/100' },
    { id: 'plantGHI', qrCode: 'plantGHI', strain: 'OG Kush', status: 'Floração', attentionReason: 'Ácaros Aranha', lastUpdated: '1 dia atrás', photoUrl: 'https://picsum.photos/seed/cannabis-spider-mites/100/100' },
];


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


  // Initialize BarcodeDetector
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore - Suppress type checking for experimental API
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        console.log('BarcodeDetector initialized');
      } catch (error) {
        console.error('Failed to initialize BarcodeDetector:', error);
        setScannerStatus('error');
        setScannerError('Falha ao inicializar o leitor de QR code.');
      }
    } else {
      console.warn('BarcodeDetector API not supported.');
      setScannerStatus('error');
      setScannerError('Seu navegador não suporta escaneamento de QR code.');
    }
  }, []);

    // --- Stop Media Stream ---
   const stopMediaStream = useCallback(() => {
     console.log("Attempting to stop media stream...");
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
       console.log("Media stream stopped.");
     }
     if (videoRef.current) {
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


  // Cleanup interval on unmount
  useEffect(() => {
    // This cleanup runs when the component unmounts
    return () => {
      console.log("Home component unmounting, stopping scan interval.");
      stopScanInterval(); // Now defined before use
      stopMediaStream(); // Also ensure stream stops on unmount
    };
  }, [stopScanInterval, stopMediaStream]); // Ensure dependencies are stable


  // --- Request Camera Permission ---
  const requestCameraPermission = useCallback(async () => {
     // Check if already initializing or scanning to prevent double requests
     if (scannerStatus !== 'permission-pending') {
        console.log("Camera permission request skipped, status is:", scannerStatus);
        return;
     }
     console.log("Requesting camera permission...");
     setScannerError(null); // Clear previous errors

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      console.log("Camera permission granted.");
      streamRef.current = stream; // Store the stream
      setScannerStatus('initializing'); // Move to initializing state

       // Attach stream if video ref is valid
       if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log("Video stream attached.");
          // Start playing ONLY when metadata is loaded (handled in another useEffect)
       } else {
           console.warn("Video ref became null before attaching stream.");
           setScannerStatus('error');
           setScannerError('Falha ao configurar a visualização da câmera.'); // Error message
           stopMediaStream(); // Cleanup stream if attachment failed
       }

    } catch (error) {
      console.error('Error accessing camera:', error);
       let errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
       if (error instanceof Error) {
            if (error.name === 'NotAllowedError') {
                errorMsg = 'Permissão da câmera negada pelo usuário.';
            } else if (error.name === 'NotFoundError') {
                errorMsg = 'Nenhuma câmera traseira encontrada ou compatível (tentando facingMode: environment).';
            } else if (error.name === 'NotReadableError' || error.name === 'OverconstrainedError') {
                errorMsg = 'Câmera já em uso ou não suporta a configuração solicitada.';
            } else {
                errorMsg = `Erro ao acessar câmera: ${error.message}`;
            }
       }
      setScannerError(errorMsg);
      setScannerStatus('permission-denied'); // Update status specifically
      toast({
        variant: 'destructive',
        title: 'Erro de Câmera',
        description: errorMsg,
      });
       stopMediaStream(); // Ensure stream is stopped on error
    }
  }, [scannerStatus, stopMediaStream, toast]); // Dependencies: status, cleanup func, toast

  // --- Start Scan Interval ---
  const startScanInterval = useCallback(() => {
     stopScanInterval(); // Clear any existing interval first
     console.log("Attempting to start scan interval...");

     if (!barcodeDetectorRef.current) {
        console.error("BarcodeDetector not available.");
        setScannerStatus('error');
        setScannerError('Leitor de QR code não está pronto.');
        return;
     }
     // Ensure video is ready and playing
     if (!videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA || videoRef.current.paused || videoRef.current.ended) {
         console.warn("Video not ready or not playing, delaying scan start.");
         // Don't set status here, let the initialization flow handle it
         // If already initializing, it will retry; if scanning, something else stopped it
         return;
     }

    setScannerStatus('scanning'); // Set status to scanning *before* setting interval
    console.log("Scan interval setup starting...");

    scanIntervalRef.current = setInterval(async () => {
       // Check conditions inside interval as well
       if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || scannerStatus !== 'scanning') {
         console.log(`Scan interval tick skipped or stopping: video stopped (${videoRef.current?.paused}) or status changed (${scannerStatus}).`);
         stopScanInterval(); // Stop if conditions are no longer met
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
        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0 && scannerStatus === 'scanning') { // Check status again to prevent race conditions
          const qrCodeData = barcodes[0].rawValue;
          console.log('QR Code detectado:', qrCodeData);

          stopScanInterval(); // Stop scanning on success FIRST
          stopMediaStream(); // Stop the camera stream
          setScannerStatus('stopped'); // Indicate scanning stopped successfully

          toast({ title: 'QR Code Detectado!', description: `Redirecionando para planta ${qrCodeData}...` });

          // Use sessionStorage to reliably pass data before navigation
          sessionStorage.setItem('pendingNavigationQr', qrCodeData);
          setIsDialogOpen(false); // Close the dialog, navigation happens in handleOpenChange cleanup

        } else if (barcodes.length === 0) {
            // console.log("No QR code detected in this frame."); // Optional: log for debugging
        }
      } catch (error: any) {
        // Ignore detection errors if they are DOMExceptions (can happen during stream transitions)
        if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError')) {
            console.warn('DOMException during barcode detection (likely stream interruption or detector issue):', error.message);
            // Consider stopping if this happens frequently, might indicate a bigger issue
        } else {
            console.error('Erro durante a detecção do código de barras:', error);
            setScannerError(`Falha ao escanear QR code: ${error.message || 'Erro desconhecido'}`);
            setScannerStatus('error'); // Set error status
            stopScanInterval(); // Stop on significant error
            stopMediaStream(); // Also stop stream on error
        }
      }
    }, 500); // Scan approx 2 times per second (adjust as needed)
    console.log("Scan interval setup complete.");
  }, [stopScanInterval, stopMediaStream, toast, scannerStatus]); // Added dependencies


   // --- Dialog Open/Close Handler ---
   const handleOpenChange = useCallback((open: boolean) => {
    console.log(`Dialog open state changed to: ${open}`);
    setIsDialogOpen(open);
    if (open) {
        // Reset state when opening
        setScannerError(null);
        setScannerStatus('permission-pending'); // Start permission check flow
        console.log("Dialog opened, status set to permission-pending.");
    } else {
        // Cleanup when closing
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
    }
  }, [stopMediaStream, stopScanInterval, router]); // Added dependencies

   // --- Effect to manage camera permission and scanning based on status ---
  useEffect(() => {
     console.log(`Effect triggered. Dialog open: ${isDialogOpen}, Scanner status: ${scannerStatus}`);

    if (isDialogOpen && scannerStatus === 'permission-pending') {
        console.log("Effect: Requesting camera permission.");
        requestCameraPermission();
    }

    const videoElement = videoRef.current;
    let canPlayHandler = () => {};
    let loadedMetadataHandler = () => {};
    let playErrorHandler = (error: Event) => {
        console.error("Error playing video:", error);
        setScannerError("Falha ao iniciar o vídeo da câmera.");
        setScannerStatus('error');
        stopMediaStream();
    };

    if (videoElement && scannerStatus === 'initializing' && streamRef.current) {
       console.log("Effect: Scanner status is initializing, setting up video handlers.");

        // Handler for when video metadata (like dimensions) is loaded
        loadedMetadataHandler = async () => {
             console.log("Video metadata loaded.");
             // Double check stream hasn't changed
            if (videoElement.srcObject !== streamRef.current) {
                 console.warn("Stream changed before metadata loaded? Re-attaching.");
                 videoElement.srcObject = streamRef.current;
             }
             // Attempt to play the video now that we know its dimensions etc.
             try {
                 if (videoElement.paused) { // Only play if paused
                    await videoElement.play();
                    console.log("Video play attempted successfully after metadata load.");
                 } else {
                     console.log("Video already playing when metadata loaded.");
                     // If already playing, maybe trigger canPlay logic directly
                     if(videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
                         canPlayHandler();
                     }
                 }
             } catch (playError) {
                 playErrorHandler(playError as Event); // Handle play error
             }
         };

         // Handler for when the browser thinks it can play the video through
         canPlayHandler = () => {
             console.log("Video 'canplay' event fired.");
             // Ensure we are still initializing and video is playing
             if (scannerStatus === 'initializing' && !videoElement.paused) {
                 console.log("Video can play, starting scan interval.");
                 startScanInterval(); // Start scanning now!
             } else {
                 console.warn(`Video can play, but conditions not met. Status: ${scannerStatus}, Paused: ${videoElement.paused}. Not starting scan.`);
             }
         };

        videoElement.addEventListener('loadedmetadata', loadedMetadataHandler);
        videoElement.addEventListener('canplay', canPlayHandler);
        videoElement.addEventListener('error', playErrorHandler); // Add error listener

        // Optional: listen for pause events to potentially stop scanning
        // videoElement.addEventListener('pause', () => {
        //     console.log("Video paused event detected.");
        //     if (scannerStatus === 'scanning') {
        //         stopScanInterval();
        //     }
        // });

        // Initial check in case events fired *before* listeners attached (rare but possible)
        if (videoElement.readyState >= videoElement.HAVE_METADATA && videoElement.srcObject === streamRef.current) {
            console.log("Effect: Metadata already loaded on listener attach.");
             loadedMetadataHandler(); // Attempt play
        }
         if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && !videoElement.paused && scannerStatus === 'initializing') {
            console.log("Effect: Video already playable on listener attach.");
              canPlayHandler(); // Attempt scan
         }

    } else if (!isDialogOpen && (scannerStatus === 'scanning' || scannerStatus === 'initializing')) {
         // Ensure cleanup if dialog is closed while scanning/initializing
         console.log(`Effect: Dialog closed or status (${scannerStatus}) changed, stopping scan interval.`);
         stopScanInterval();
    }


    return () => {
        // Cleanup: Remove event listeners when effect re-runs or component unmounts
        if (videoElement) {
             console.log("Effect cleanup: Removing video event listeners.");
             videoElement.removeEventListener('loadedmetadata', loadedMetadataHandler);
             videoElement.removeEventListener('canplay', canPlayHandler);
             videoElement.removeEventListener('error', playErrorHandler); // Remove error listener
             // Optionally pause video on cleanup if it's still playing
             if (!videoElement.paused) {
                 videoElement.pause();
                 console.log("Effect cleanup: Paused video.");
             }
        }
        // Stop interval just in case it's running during cleanup
        // stopScanInterval(); // Already handled by dialog close or unmount effect
    };
    // Carefully select dependencies to avoid infinite loops or stale closures
  }, [isDialogOpen, scannerStatus, requestCameraPermission, startScanInterval, stopMediaStream, stopScanInterval]);


  // --- Button Click Handlers ---
  const handleScanClick = () => {
    console.log("Scan button clicked.");
    // Check BarcodeDetector support before opening dialog
    if (!('BarcodeDetector' in window) || !window.BarcodeDetector) { // Check window.BarcodeDetector existence
       toast({
         variant: 'destructive',
         title: 'Navegador Incompatível',
         description: 'O escaneamento de QR code não é suportado neste navegador.',
       });
       return;
    }
     // Check if detector was initialized successfully
     if (!barcodeDetectorRef.current) {
        toast({
         variant: 'destructive',
         title: 'Erro no Leitor',
         description: 'Não foi possível inicializar o leitor de QR code. Tente recarregar a página.',
       });
       return;
     }
    handleOpenChange(true); // Open the dialog
  };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A página de cadastro de plantas ainda não foi implementada.',
      variant: 'default',
    });
    // router.push('/register-plant'); // Uncomment when register page exists
  };


  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5 text-foreground"> {/* Subtle gradient */}
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-10 w-10 text-primary animate-pulse duration-3000" /> {/* Subtle pulse */}
            <h1 className="text-4xl font-bold text-primary tracking-tight drop-shadow-sm">CannaLog</h1> {/* Shadow */}
        </div>
        <p className="text-lg text-muted-foreground">Seu painel de controle de cultivo inteligente.</p> {/* Improved desc */}
      </header>

      {/* Main Content Area - Grid Layout */}
       <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Left Column (Quick Actions & Attention) */}
          <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions Card */}
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 card border border-primary/10"> {/* Added subtle border */}
               <CardHeader>
                 <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle> {/* Semibold */}
               </CardHeader>
               <CardContent className="flex flex-col gap-3">
                 <Button
                   size="lg"
                   className="w-full text-lg font-semibold button justify-start"
                   onClick={handleRegister}
                   aria-label="Cadastrar Nova Planta"
                   disabled={isDialogOpen} // Disable while dialog is open
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
                   disabled={isDialogOpen} // Disable while dialog is open
                 >
                   <ScanLine className="mr-3 h-5 w-5" />
                   Escanear QR Code
                 </Button>
               </CardContent>
             </Card>

              {/* Plants Needing Attention Card */}
              <AttentionPlants plants={mockAttentionPlants} />

          </div>

           {/* Right Column (Recent Plants) */}
           <div className="lg:col-span-2">
              <RecentPlants plants={mockRecentPlants} />
           </div>

       </main>

      {/* Scanner Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] dialog-content border-primary/20"> {/* Subtle border */}
          <DialogHeader>
            <DialogTitle className="text-xl">Escanear QR Code</DialogTitle> {/* Size up */}
            <DialogDescription>
              Aponte a câmera para o QR code da planta.
            </DialogDescription>
          </DialogHeader>

          {/* Container for video and overlays */}
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
            {/* Video element - Always render for ref stability, control visibility/content via status */}
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${scannerStatus === 'scanning' || scannerStatus === 'initializing' || scannerStatus === 'stopped' ? 'opacity-100' : 'opacity-0'}`} // Keep visible while stopped to show last frame
              playsInline // Essential for iOS Safari
              muted // Often required for autoplay
              // No autoPlay here, we trigger it programmatically via useEffect
            />

             {/* Visual Guide Overlay - Show ONLY when scanning */}
             {scannerStatus === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Outer dimming effect */}
                    <div className="absolute inset-0 bg-black/40"></div>
                    {/* Inner transparent square with border */}
                    <div className="relative w-[70%] h-[70%]">
                        <div className="absolute inset-0 border-4 border-primary/70 rounded-lg animate-pulse"></div>
                        {/* Optional: Corner markers - commented out for simplicity */}
                    </div>
                </div>
             )}

             {/* Status Overlay (Loading, Permission Denied, Error) - Show when NOT scanning/stopped/idle */}
             {scannerStatus !== 'scanning' && scannerStatus !== 'stopped' && scannerStatus !== 'idle' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-center p-4 rounded-lg z-10 transition-opacity duration-300">
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
                           <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                           <p className="text-lg font-semibold text-destructive">
                               {scannerStatus === 'permission-denied' ? 'Acesso Negado' : 'Erro na Câmera'}
                           </p>
                           <p className="text-muted-foreground text-sm mt-1 px-4">
                             {scannerError || 'Não foi possível acessar a câmera.'}
                           </p>
                           {/* Optionally add a retry button here */}
                           {/* <Button variant="outline" size="sm" className="mt-3" onClick={requestCameraPermission}>Tentar Novamente</Button> */}
                         </>
                       )}
                       {/* General Scanner Error State (non-camera related) */}
                       {scannerStatus === 'error' && scannerError && !scannerError?.toLowerCase().includes('câmera') && (
                          <>
                            <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                             <p className="text-lg font-semibold text-destructive">Erro no Escaneamento</p>
                            <p className="text-muted-foreground text-sm mt-1 px-4">
                                {scannerError}
                            </p>
                          </>
                       )}

                  </div>
             )}
          </div>

           {/* Alert for Scan-Specific Errors (only if not covered by the overlay) */}
           {/* This might be redundant now with the overlay handling errors */}
           {/* {scannerStatus === 'error' && scannerError && !scannerError?.toLowerCase().includes('câmera') && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Erro no Escaneamento</AlertTitle>
                  <AlertDescription>{scannerError}</AlertDescription>
                </Alert>
           )} */}


          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="button">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
