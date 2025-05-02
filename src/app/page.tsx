'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, PlusCircle, VideoOff, Loader2, Sprout } from 'lucide-react'; // Added Sprout icon
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // To store the stream for stopping later

  // Request camera permission when component mounts or when scan starts
  useEffect(() => {
    const getCameraPermission = async () => {
      // Only request if permission status is unknown or denied previously
      if (hasCameraPermission === null || hasCameraPermission === false) {
         setScanError(null); // Clear previous errors
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
        } catch (error) {
          console.error('Erro ao acessar a câmera:', error); // Translated
          setHasCameraPermission(false);
          setScanError('Permissão da câmera negada. Habilite nas configurações do navegador.'); // Translated
           toast({
             variant: 'destructive',
             title: 'Acesso à Câmera Negado', // Translated
             description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.', // Translated
           });
        }
      }
    };

    // Request permission immediately if user tries to scan without it determined
    if (isScanning && hasCameraPermission === null) {
        getCameraPermission();
    }

    // Cleanup: stop video stream when component unmounts or scanning stops
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        console.log("Camera stream stopped");
      }
    };
  }, [isScanning, hasCameraPermission, toast]); // Rerun if scanning starts or permission changes

  const startScan = async () => {
     setScanError(null);
     setIsScanning(true);

     // Ensure permission is granted before proceeding fully
     if (hasCameraPermission === null) {
         try {
           streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
           setHasCameraPermission(true);
           if (videoRef.current) {
             videoRef.current.srcObject = streamRef.current;
           }
         } catch (error) {
           console.error('Erro ao acessar a câmera:', error); // Translated
           setHasCameraPermission(false);
            setScanError('Permissão da câmera negada. Habilite nas configurações do navegador.'); // Translated
            toast({
              variant: 'destructive',
              title: 'Acesso à Câmera Negado', // Translated
              description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.', // Translated
            });
           setIsScanning(false); // Stop scanning if permission denied
           return;
         }
     } else if (hasCameraPermission === false) {
         setScanError('A permissão da câmera é necessária para escanear.'); // Translated
         toast({
           variant: 'destructive',
           title: 'Permissão Necessária', // Translated
           description: 'A permissão da câmera foi negada anteriormente. Habilite-a nas configurações do navegador.', // Translated
         });
         setIsScanning(false);
         return;
     }

     // --- Actual QR Code Detection Would Go Here ---
      // Using Barcode Detection API (example structure)
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          const detect = async () => {
             // Ensure video element is ready and we are still scanning
            if (!videoRef.current || videoRef.current.readyState < 2 || !isScanning) {
                 if(isScanning) requestAnimationFrame(detect); // If still scanning, try again shortly
                return;
            }

            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && isScanning) { // Double check isScanning state
                const qrCodeData = barcodes[0].rawValue;
                console.log('QR Code detectado:', qrCodeData); // Translated
                toast({
                  title: 'QR Code Detectado', // Translated
                  description: `Navegando para a planta ${qrCodeData}...`, // Translated
                 });
                setIsScanning(false); // Stop scanning state
                router.push(`/plant/${qrCodeData}`);
              } else if (isScanning) {
                requestAnimationFrame(detect); // Keep scanning if no QR code found yet and not cancelled
              }
            } catch (error: any) {
               console.error('Erro na detecção do código de barras:', error); // Translated
               // Avoid setting error repeatedly if detection loop continues
               if (isScanning && !scanError) {
                   setScanError(`Falha ao escanear: ${error.message || 'Erro desconhecido'}`); // Translated
               }
               // Optional: Stop scanning on error or let it continue trying
               // setIsScanning(false);
               // handleCloseScanner(); // Close dialog on error
               if (isScanning) requestAnimationFrame(detect); // Keep trying even on error
            }
          };
          requestAnimationFrame(detect); // Start the detection loop
        } catch (error: any) {
            console.error("Falha ao inicializar BarcodeDetector:", error); // Translated
            setScanError(`API de escaneamento não suportada ou falhou: ${error.message}`); // Translated
            setIsScanning(false); // Stop if API setup fails
        }
      } else {
        console.warn('API de Detecção de Código de Barras não suportada.'); // Translated
        setScanError('Seu navegador não suporta escaneamento de QR code nativo.'); // Translated
        setIsScanning(false); // Stop if API not supported
      }
     // ---------------------------------------------

     // Remove the simulation block as real detection is implemented above
     // console.log("Simulando escaneamento...");
     // await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate scanning time
     // if (isScanning) { // Check if user cancelled
     //    const simulatedQrCode = 'plant123';
     //    console.log(`QR Code simulado encontrado: ${simulatedQrCode}`); // Translated
     //    toast({
     //       title: 'QR Code Encontrado (Simulado)', // Translated
     //       description: `Navegando para a planta ${simulatedQrCode}...`, // Translated
     //     });
     //    setIsScanning(false);
     //    router.push(`/plant/${simulatedQrCode}`);
     // }
  };


  const handleScanClick = () => {
    // Reset state before starting
    setScanError(null);
    // Request permission first if needed, then start scan internally
    if (hasCameraPermission !== true) {
        const requestAndScan = async () => {
            try {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                }
                startScan(); // Start scanning only after permission is granted
            } catch (error) {
                console.error('Erro ao acessar a câmera ao clicar:', error); // Translated
                setHasCameraPermission(false);
                setScanError('Permissão da câmera negada. Habilite nas configurações do navegador.'); // Translated
                toast({
                    variant: 'destructive',
                    title: 'Acesso à Câmera Negado', // Translated
                    description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.', // Translated
                });
                setIsScanning(false); // Ensure scanning stops if permission fails here
            }
        };
        setIsScanning(true); // Set scanning true to open dialog while waiting for permission
        requestAndScan();
    } else {
        startScan(); // Permission already granted, start scanning
    }
};


  const handleRegister = () => {
    console.log('Navegar para a página de registro...'); // Translated
    toast({
      title: 'Funcionalidade Indisponível', // Translated
      description: 'A página de cadastro de plantas ainda não foi implementada.', // Translated
      variant: 'default', // Changed to default for info
    });
    // Example: router.push('/register-plant'); // Uncomment when register page exists
  };

  const handleCloseScanner = () => {
     setIsScanning(false);
     // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setScanError(null); // Clear error when closing dialog
      console.log("Scanner dialog closed and camera stopped.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-secondary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 hover:shadow-2xl transition-shadow duration-300 card"> {/* Added hover effect class */}
        <CardHeader className="items-center text-center pb-4">
          {/* Placeholder logo - consider a more relevant cannabis icon */}
           <Sprout className="h-16 w-16 text-primary mb-4" />
           {/* <Image
             data-ai-hint="cannabis leaf logo green dark modern simple" // Refined hint
             // Consider using an SVG or a themed image source
             src="https://picsum.photos/seed/cannabis-modern-logo/100/100"
             alt="CannaLog Logo"
             width={80}
             height={80}
             className="mb-4 rounded-lg" // Use lg radius for consistency
           /> */}
          <CardTitle className="text-4xl font-bold text-primary tracking-tight">
            CannaLog
          </CardTitle>
          <p className="text-muted-foreground mt-1">Seu Companheiro Digital para o Cultivo</p> {/* Refined description */}
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 p-6 pt-2">
           <Button
            size="lg"
            className="w-full text-lg font-semibold button" // Added font-semibold and base button class
            onClick={handleRegister}
            aria-label="Cadastrar Nova Planta"
            disabled={isScanning}
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            Cadastrar Planta
          </Button>
          <Button
            size="lg"
            variant="secondary" // Use secondary variant for contrast
            className="w-full text-lg font-semibold button" // Added font-semibold and base button class
            onClick={handleScanClick}
            aria-label="Escanear QR Code da Planta"
            disabled={isScanning} // Disable button while scanning dialog is potentially active
          >
            <ScanLine className="mr-2 h-6 w-6" />
            Escanear QR Code
          </Button>
           <p className="text-center text-foreground/70 text-sm mt-4 px-4">
             Registre novas plantas ou escaneie um QR code existente para acessar e atualizar o diário de cultivo.
           </p> {/* More descriptive text */}
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <Dialog open={isScanning} onOpenChange={handleCloseScanner}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] dialog-content"> {/* Added base dialog class */}
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle> {/* Translated */}
            <DialogDescription>
              Aponte a câmera para o QR code da planta. O escaneamento iniciará automaticamente. {/* Translated & Clarified */}
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner"> {/* Use lg radius */}
             {/* Video element MUST be present for BarcodeDetector, even if hidden */}
             <video
               ref={videoRef}
               className={`h-full w-full object-cover transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`} // Fade in video
               autoPlay
               muted
               playsInline // Important for mobile
             />
             {/* Overlay for visual feedback - Improved Style */}
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`}>
                   <div className="w-[70%] h-[70%] border-4 border-primary/70 rounded-lg shadow-lg" style={{
                       boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)', // Dim overlay effect
                   }}>
                       {/* Optional inner scanning line animation */}
                       {/* <div className="absolute top-0 left-1/2 w-full h-1 bg-accent animate-scan-line"></div> */}
                   </div>
              </div>

            {/* Loading/Permission State Overlay */}
            {(hasCameraPermission === null || hasCameraPermission === false) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 text-center p-4 rounded-lg"> {/* Use lg radius */}
                {hasCameraPermission === null ? (
                  <>
                    <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                    <p className="text-lg font-semibold">Aguardando Câmera...</p> {/* Translated */}
                    <p className="text-muted-foreground text-sm mt-1">Solicitando permissão de acesso.</p> {/* Translated */}
                  </>
                ) : ( // hasCameraPermission === false
                  <>
                    <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                    <p className="text-lg font-semibold text-destructive">Acesso Negado</p> {/* Translated */}
                    <p className="text-muted-foreground text-sm mt-1">Permita o acesso à câmera nas configurações do seu navegador.</p> {/* Translated */}
                  </>
                )}
              </div>
            )}
          </div>
          {scanError && (
            <Alert variant="destructive" className="mt-4">
               <AlertCircle className="h-4 w-4" /> {/* Added icon */}
              <AlertTitle>Erro no Escaneamento</AlertTitle> {/* Translated */}
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="mt-6"> {/* Increased top margin */}
            <Button variant="outline" onClick={handleCloseScanner} className="button"> {/* Added base button class */}
              Cancelar {/* Translated */}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Optional: Add keyframes for scanning line animation in globals.css if desired
/*
@keyframes scan-line {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(calc(var(--video-height, 300px) + 100%)); } // Adjust height based on video
}
.animate-scan-line {
  animation: scan-line 2.5s linear infinite;
}
*/
