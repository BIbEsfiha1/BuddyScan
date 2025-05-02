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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // To store the stream for stopping later

  // --- Camera Permission Logic ---
   useEffect(() => {
     const getCameraPermission = async () => {
       // Only try if permission is not granted or not determined yet
       if (isScanning && (hasCameraPermission === null || hasCameraPermission === false)) {
         setScanError(null); // Clear previous errors before trying again
         try {
           console.log("Requesting camera permission...");
           streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
           console.log("Camera permission granted.");
           setHasCameraPermission(true);
           if (videoRef.current) {
             videoRef.current.srcObject = streamRef.current;
           }
           // Start scan immediately after getting permission inside the dialog
           startScanInternal();
         } catch (error) {
           console.error('Erro ao acessar a câmera:', error);
           setHasCameraPermission(false);
           const errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
           setScanError(errorMsg);
           toast({
             variant: 'destructive',
             title: 'Acesso à Câmera Negado',
             description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
           });
           // Close the dialog if permission is denied
           setIsScanning(false);
         }
       }
     };

     getCameraPermission();

     // Cleanup function to stop the camera stream when the component unmounts or scanning stops
     return () => {
       if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
         if (videoRef.current) {
           videoRef.current.srcObject = null;
         }
         console.log("Camera stream stopped on cleanup.");
       }
     };
     // Re-run effect if isScanning changes or hasCameraPermission changes from null/false
   }, [isScanning, hasCameraPermission, toast]);
  // --- End Camera Permission Logic ---


  // --- Scan/Register Logic ---
  // Renamed internal start function to avoid naming collision
   const startScanInternal = async () => {
       if (!isScanning || !videoRef.current || !hasCameraPermission) {
           console.log("Scan aborted: Not scanning, no video element, or no permission.");
           return;
       }

        // Actual QR Code Detection Logic
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            let detectionActive = true; // Flag to control the loop

            const detect = async () => {
              // Check conditions before detecting
              if (!detectionActive || !isScanning || !videoRef.current || videoRef.current.readyState < 2) {
                   console.log("Detection stopping or conditions not met.");
                  return; // Stop if not scanning, video not ready, or explicitly stopped
              }

              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0 && isScanning) {
                  const qrCodeData = barcodes[0].rawValue;
                  console.log('QR Code detectado:', qrCodeData);
                  toast({ title: 'QR Code Detectado', description: `Abrindo detalhes da planta ${qrCodeData}...` });
                  detectionActive = false; // Stop detection loop
                  handleCloseScanner(); // Close dialog
                  router.push(`/plant/${qrCodeData}`); // Navigate
                } else if (isScanning) {
                  // Continue scanning if no QR code found yet and still in scanning mode
                  requestAnimationFrame(detect);
                } else {
                   detectionActive = false; // Stop if isScanning became false
                }
              } catch (error: any) {
                 console.error('Erro na detecção do código de barras:', error);
                 if (isScanning && !scanError && detectionActive) {
                     // Only set error if still scanning and no previous error shown
                     setScanError(`Falha ao escanear: ${error.message || 'Erro desconhecido'}`);
                 }
                 if (isScanning && detectionActive) requestAnimationFrame(detect); // Retry detection only if still scanning
                 else detectionActive = false;
              }
            };
            requestAnimationFrame(detect); // Start the detection loop

            // Ensure detection stops if dialog closes
            const stopDetection = () => { detectionActive = false; };
            return stopDetection; // Return a function to stop detection if needed externally

          } catch (error: any) {
              console.error("Falha ao inicializar BarcodeDetector:", error);
              setScanError(`API de escaneamento não suportada ou falhou: ${error.message}`);
              setIsScanning(false); // Stop scanning if detector fails to initialize
          }
        } else {
          console.warn('API de Detecção de Código de Barras não suportada.');
          setScanError('Seu navegador não suporta escaneamento de QR code.');
          setIsScanning(false); // Stop scanning if API is not supported
        }
   };

   const handleScanClick = () => {
     setScanError(null); // Reset error on new scan attempt
     setIsScanning(true); // Open the dialog
     // The useEffect will handle permission request and starting the scan
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
      console.log("Closing scanner dialog...");
      setIsScanning(false);
      // Stop the camera stream
       if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
       }
       if (videoRef.current) {
         videoRef.current.srcObject = null;
       }
       setScanError(null); // Clear any errors when closing
       setHasCameraPermission(null); // Reset permission state for next open
       console.log("Scanner dialog closed and camera stopped.");
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
      <Dialog open={isScanning} onOpenChange={(open) => !open && handleCloseScanner()}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] dialog-content">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>
              Aponte a câmera para o QR code da planta. O escaneamento iniciará automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
             {/* Video element MUST be present even before permission for refs */}
             <video
               ref={videoRef}
               className={`h-full w-full object-cover transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`}
               autoPlay
               muted
               playsInline // Important for mobile
             />
              {/* Visual Guide Overlay */}
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`}>
                   <div className="w-[70%] h-[70%] border-4 border-primary/70 rounded-lg" style={{
                       boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)', // Dimming effect outside the box
                   }}>
                   </div>
                   {/* Optional: Add a subtle scanning line animation */}
                   {/* <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 animate-scan-line"></div> */}
              </div>
            {/* Permission States Overlay */}
            {(hasCameraPermission === null || hasCameraPermission === false) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 text-center p-4 rounded-lg z-10">
                {hasCameraPermission === null ? (
                  <>
                    <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                    <p className="text-lg font-semibold">Aguardando Câmera...</p>
                    <p className="text-muted-foreground text-sm mt-1">Solicitando permissão de acesso.</p>
                  </>
                ) : ( // hasCameraPermission === false
                  <>
                    <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                    <p className="text-lg font-semibold text-destructive">Acesso Negado</p>
                    <p className="text-muted-foreground text-sm mt-1">Permita o acesso à câmera nas configurações do seu navegador.</p>
                  </>
                )}
              </div>
            )}
          </div>
          {scanError && (
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
