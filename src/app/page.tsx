'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History, AlertCircle as AlertCircleIcon } from 'lucide-react'; // Added icons
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
import RecentPlants from '@/components/dashboard/recent-plants'; // Import new component
import AttentionPlants from '@/components/dashboard/attention-plants'; // Import new component
import { Separator } from '@/components/ui/separator'; // Import Separator

// Mock Data (Replace with actual data fetching later)
// Updated seeds for more relevant cannabis placeholder images
const mockRecentPlants = [
    { id: 'plant123', qrCode: 'plant123', strain: 'Variedade Exemplo', status: 'Vegetativo', lastUpdated: 'Ontem', photoUrl: 'https://picsum.photos/seed/cannabis-veg-healthy-day1/100/100' },
    { id: 'plant456', qrCode: 'plant456', strain: 'Purple Haze', status: 'Floração', lastUpdated: '2 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-flowering-early/100/100' },
    { id: 'plant789', qrCode: 'plant789', strain: 'Sour Diesel', status: 'Secagem', lastUpdated: '5 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-drying-buds/100/100' },
    // Add more mock plants
];

const mockAttentionPlants = [
    { id: 'plantABC', qrCode: 'plantABC', strain: 'Cepa Problema', status: 'Vegetativo', attentionReason: 'Deficiência de Nitrogênio', lastUpdated: '3 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-nitrogen-deficiency/100/100' },
    { id: 'plantDEF', qrCode: 'plantDEF', strain: 'White Widow', status: 'Floração', attentionReason: 'Umidade Alta Detectada', lastUpdated: 'Hoje', photoUrl: 'https://picsum.photos/seed/cannabis-high-humidity-mold/100/100' },
    { id: 'plantGHI', qrCode: 'plantGHI', strain: 'OG Kush', status: 'Floração', attentionReason: 'Ácaros Aranha', lastUpdated: '1 dia atrás', photoUrl: 'https://picsum.photos/seed/cannabis-spider-mites/100/100' },
    // Add more mock plants needing attention
];


export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); // null: checking, true: granted, false: denied
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // To store the stream for stopping later
  const barcodeDetectorRef = useRef<any | null>(null); // Store detector instance
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for timeout

  // Initialize BarcodeDetector once
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore BarcodeDetector might not be fully typed in all envs
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        console.log('BarcodeDetector initialized');
      } catch (error) {
        console.error('Failed to initialize BarcodeDetector:', error);
        // No need to set state error here, handle when scanning starts
      }
    } else {
      console.warn('BarcodeDetector API not supported.');
      // No need to set state error here, handle when scanning starts
    }

    // Cleanup: Clear timeout if component unmounts
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

  // --- Camera Permission Logic ---
  useEffect(() => {
    let isMounted = true; // Track component mount status

    const getCameraPermission = async () => {
      console.log("getCameraPermission called. isScanning:", isScanning, "hasCameraPermission:", hasCameraPermission);
      if (!isScanning) {
          console.log("Not scanning, exiting getCameraPermission.");
          // Ensure stream is stopped if dialog closed before permission granted/denied
          if (streamRef.current) {
             console.log("Stopping stream on scan cancellation.");
             streamRef.current.getTracks().forEach(track => track.stop());
             streamRef.current = null;
             if (videoRef.current) {
                videoRef.current.srcObject = null;
             }
          }
          // Also clear any running detection timeouts
          if (detectionTimeoutRef.current) {
             clearTimeout(detectionTimeoutRef.current);
             detectionTimeoutRef.current = null;
             console.log("Cleared detection timeout on scan cancellation.");
          }
          return;
      }

      // Only request if permission state is unknown (null)
      if (hasCameraPermission === null) {
        setScanError(null); // Clear previous errors when starting check
        console.log("Requesting camera permission...");
        try {
           const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
           console.log("Camera permission granted.");
           if (isMounted) { // Check if component is still mounted
               streamRef.current = stream; // Store the stream
               setHasCameraPermission(true); // Update state *before* attaching stream
               // Defer attaching stream slightly to allow state update and render
               requestAnimationFrame(() => {
                   if (videoRef.current && streamRef.current) {
                       console.log("Attaching stream to video element.");
                       videoRef.current.srcObject = streamRef.current;
                       videoRef.current.play().catch(playError => { // Attempt to play explicitly
                           console.error("Error playing video:", playError);
                           setScanError("Falha ao iniciar o vídeo da câmera.");
                           setHasCameraPermission(false); // Set permission to false if play fails
                       });
                       // Don't start scan immediately, wait for video to be ready
                       videoRef.current.onloadedmetadata = () => {
                           console.log("Video metadata loaded, ready to scan.");
                           startScanInternal(); // Start scan *after* metadata is loaded
                       };
                   } else {
                       console.warn("Video ref or stream became null before attachment.");
                   }
               });
           } else {
               console.log("Component unmounted before permission granted, stopping stream.");
               stream.getTracks().forEach(track => track.stop());
           }
        } catch (error) {
          console.error('Erro ao acessar a câmera:', error);
          if (isMounted) {
              let errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
              if (error instanceof Error && error.name === 'NotAllowedError') {
                  errorMsg = 'Permissão da câmera negada pelo usuário.';
              } else if (error instanceof Error && error.name === 'NotFoundError') {
                  errorMsg = 'Nenhuma câmera encontrada ou compatível.';
              } else if (error instanceof Error) {
                  errorMsg = `Erro ao acessar câmera: ${error.message}`;
              }

              setHasCameraPermission(false); // Set permission to denied
              setScanError(errorMsg);
              toast({
                variant: 'destructive',
                title: 'Erro de Câmera',
                description: errorMsg,
              });
          }
        }
      } else if (hasCameraPermission === true && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
          // If permission was granted previously but stream isn't attached (e.g., after closing/reopening)
          console.log("Re-attaching existing stream.");
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(playError => {
              console.error("Error playing video on re-attach:", playError);
              setScanError("Falha ao reiniciar o vídeo da câmera.");
              setHasCameraPermission(false);
          });
           videoRef.current.onloadedmetadata = () => {
              console.log("Video metadata loaded on re-attach, ready to scan.");
              startScanInternal(); // Start scan again
           };
      } else if (hasCameraPermission === true && !streamRef.current) {
           // Edge case: state is true, but streamRef is null (should not happen often)
           console.warn("Permission is true, but streamRef is null. Requesting stream again.");
           // Reset state to trigger full permission request flow again
           setHasCameraPermission(null);
      } else if (hasCameraPermission === true && videoRef.current?.readyState >= videoRef.current?.HAVE_METADATA) {
          // If permission is true and video is already ready, ensure scan starts
          console.log("Permission true and video ready, ensuring scan starts.");
          startScanInternal();
      } else {
          console.log("Camera state:", {hasCameraPermission, videoReady: videoRef.current?.readyState});
      }
    };

    getCameraPermission();

    // Cleanup function
    return () => {
      isMounted = false; // Mark component as unmounted
      console.log("Scanner useEffect cleanup running. isScanning:", isScanning);
      // Stop the stream and clear timeout when the dialog is closed (isScanning becomes false)
      if (!isScanning) {
          if (streamRef.current) {
              console.log("Stopping camera stream in cleanup because scanning is false.");
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
              if (videoRef.current) {
                videoRef.current.srcObject = null;
                 videoRef.current.onloadedmetadata = null; // Remove listener
              }
          }
          if (detectionTimeoutRef.current) {
              clearTimeout(detectionTimeoutRef.current);
              detectionTimeoutRef.current = null;
              console.log("Cleared detection timeout in cleanup.");
          }
      } else {
         console.log("Cleanup: Not stopping stream/clearing timeout as scanning might still be active or refs are null.");
      }
    };
  // Depend only on isScanning. Internal logic handles the hasCameraPermission state.
  }, [isScanning, toast]); // Removed hasCameraPermission from deps
  // --- End Camera Permission Logic ---


  // --- Scan/Register Logic ---
   const startScanInternal = () => {
        if (!isScanning || !videoRef.current || !streamRef.current || videoRef.current.readyState < videoRef.current.HAVE_METADATA) {
            console.log("Scan preconditions not met:", { isScanning, video: !!videoRef.current, stream: !!streamRef.current, readyState: videoRef.current?.readyState });
            // Optional: Retry after a short delay if video isn't ready yet
            if (isScanning && videoRef.current && videoRef.current.readyState < videoRef.current.HAVE_METADATA) {
                console.log("Video not ready, scheduling retry...");
                if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current); // Clear existing timeout
                detectionTimeoutRef.current = setTimeout(startScanInternal, 200); // Retry after 200ms
            } else if (!isScanning) {
                console.log("Scan stopped, not retrying.");
            }
            return;
        }

       if (!barcodeDetectorRef.current) {
            console.error("BarcodeDetector not initialized or not supported.");
            setScanError('API de escaneamento não disponível ou falhou ao inicializar.');
            setIsScanning(false); // Close dialog if detector failed fundamentally
            return;
       }

       console.log("Starting QR code detection attempt...");
       let detectionActive = true; // Control detection attempts within this scan session

       const detect = async () => {
            // Double-check conditions before each detection attempt
            if (!detectionActive || !isScanning || !videoRef.current || videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) {
                console.log("Detection stopped or video not ready:", { detectionActive, isScanning, paused: videoRef.current?.paused, ended: videoRef.current?.ended, readyState: videoRef.current?.readyState });
                detectionTimeoutRef.current = null; // Ensure timeout ref is cleared
                return;
            }

            try {
                const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
                if (barcodes.length > 0 && isScanning && detectionActive) {
                    detectionActive = false; // Stop detection loop FIRST
                    if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current); // Clear timeout
                    detectionTimeoutRef.current = null;

                    const qrCodeData = barcodes[0].rawValue;
                    console.log('QR Code detectado:', qrCodeData);
                    toast({ title: 'QR Code Detectado', description: `Abrindo detalhes da planta ${qrCodeData}...` });

                    handleCloseScanner(); // Close dialog

                    // Slight delay before navigation to ensure state updates and cleanup start
                    setTimeout(() => {
                        router.push(`/plant/${qrCodeData}`); // Navigate
                    }, 50);

                } else if (isScanning && detectionActive) {
                    // Continue scanning: schedule next attempt
                    if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current); // Clear previous timeout before setting new one
                    detectionTimeoutRef.current = setTimeout(detect, 100); // Check again shortly
                } else {
                   console.log("Stopping detection loop (conditions changed).");
                   if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
                   detectionTimeoutRef.current = null;
                   detectionActive = false; // Ensure loop stops
                }
            } catch (error: any) {
                 console.error('Erro durante a detecção do código de barras:', error);
                 // Set error state only if still trying to scan
                  if (isScanning && detectionActive) {
                     setScanError(`Falha ao processar imagem da câmera: ${error.message || 'Erro desconhecido'}`);
                     // Stop detection on error to prevent spamming logs/errors
                     detectionActive = false;
                     if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
                     detectionTimeoutRef.current = null;
                  } else {
                      detectionActive = false; // Stop detection on error if not scanning
                      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
                      detectionTimeoutRef.current = null;
                 }
            }
       };

       // Initial call to start the detection loop
       detect();
   };

   const handleScanClick = () => {
     console.log("Scan button clicked.");
     setScanError(null); // Reset error on new scan attempt
     setHasCameraPermission(null); // Reset permission state to trigger check
     setIsScanning(true); // Open the dialog and trigger useEffect
   };


  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A página de cadastro de plantas ainda não foi implementada.',
      variant: 'default', // Changed variant to default or remove for default styling
    });
    // In the future, navigate to the registration page:
    // router.push('/register-plant');
  };

   const handleCloseScanner = () => {
      console.log("Closing scanner dialog requested...");
      setIsScanning(false); // This will trigger the useEffect cleanup
      // Explicitly clear timeout here as well, as useEffect might run slightly delayed
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
        detectionTimeoutRef.current = null;
        console.log("Cleared detection timeout on explicit close.");
      }
      setScanError(null); // Clear any errors when closing
      // Let useEffect handle camera permission reset and stream stop
      console.log("Scanner dialog close process initiated.");
   };
  // --- End Scan/Register Logic ---

  return (
     // Consistent background and padding
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-background text-foreground">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary tracking-tight">CannaLog</h1>
        </div>
        <p className="text-lg text-muted-foreground">Seu painel de controle de cultivo.</p>
      </header>

      {/* Main Content Area - Grid Layout */}
       <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Left Column (Quick Actions & Attention) */}
          <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions Card */}
             <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 card">
               <CardHeader>
                 <CardTitle className="text-xl">Ações Rápidas</CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col gap-3">
                 <Button
                   size="lg"
                   className="w-full text-lg font-semibold button justify-start" // justify-start for alignment
                   onClick={handleRegister}
                   aria-label="Cadastrar Nova Planta"
                   disabled={isScanning} // Disable while scanning dialog is open
                 >
                   <PlusCircle className="mr-3 h-5 w-5" /> {/* Adjusted margin */}
                   Cadastrar Planta
                 </Button>
                 <Button
                   size="lg"
                   variant="secondary"
                   className="w-full text-lg font-semibold button justify-start" // justify-start
                   onClick={handleScanClick}
                   aria-label="Escanear QR Code da Planta"
                   disabled={isScanning} // Disable while scanning dialog is open
                 >
                   <ScanLine className="mr-3 h-5 w-5" /> {/* Adjusted margin */}
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
       {/* Use controlled Dialog based on isScanning state */}
      <Dialog open={isScanning} onOpenChange={(open) => { if (!open) handleCloseScanner(); }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] dialog-content">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>
              Aponte a câmera para o QR code da planta. O escaneamento iniciará automaticamente.
            </DialogDescription>
          </DialogHeader>
           {/* Container for video and overlays */}
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
            {/* Video element MUST be present for the ref, always render it */}
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`} // Use opacity transition
              muted // Muted is usually required for autoplay without user interaction
              playsInline // Essential for iOS
            />

             {/* Visual Guide Overlay - Visible only when camera is active and stream is playing */}
             {hasCameraPermission === true && videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[70%] h-[70%] border-4 border-primary/70 rounded-lg animate-pulse" style={{ // Subtle pulse
                        boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)', // Dimming effect
                    }}></div>
                    {/* Optional: Add a subtle scanning line animation */}
                    {/* <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 animate-scan-line"></div> */}
                </div>
             )}

             {/* Permission/Loading/Error States Overlay - Centered */}
            {/* Show overlay if permission is not granted OR if it is granted but video isn't ready yet */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-center p-4 rounded-lg z-10 transition-opacity duration-300 ${hasCameraPermission !== true || (hasCameraPermission === true && videoRef.current && videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {hasCameraPermission === null && ( // Checking state
                <>
                  <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                  <p className="text-lg font-semibold">Aguardando Câmera...</p>
                  <p className="text-muted-foreground text-sm mt-1">Solicitando permissão de acesso.</p>
                </>
              )}
              {hasCameraPermission === true && videoRef.current && videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA && ( // Camera granted, but video loading
                <>
                  <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                  <p className="text-lg font-semibold">Carregando Câmera...</p>
                  <p className="text-muted-foreground text-sm mt-1">Preparando o vídeo para escaneamento.</p>
                </>
              )}
              {hasCameraPermission === false && ( // Denied state
                <>
                  <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                  <p className="text-lg font-semibold text-destructive">Acesso à Câmera Bloqueado</p>
                  {/* Provide specific error message */}
                  <p className="text-muted-foreground text-sm mt-1 px-4">
                    {scanError || 'Permita o acesso à câmera nas configurações do seu navegador ou aplicativo.'}
                  </p>
                </>
              )}
             </div>
          </div>

           {/* General Scan Error Alert (e.g., detection failed, but camera works) */}
           {scanError && hasCameraPermission === true && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Erro no Escaneamento</AlertTitle>
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseScanner} className="button">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Optional: Add keyframes for scan line animation in globals.css if needed
/*
@keyframes scan-line {
  0% { transform: translateY(-10%); opacity: 0.5; }
  50% { transform: translateY(110%); opacity: 1; }
  100% { transform: translateY(-10%); opacity: 0.5; }
}
.animate-scan-line {
  animation: scan-line 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
*/
