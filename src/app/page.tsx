'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, PlusCircle, VideoOff, Loader2 } from 'lucide-react';
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
     // if ('BarcodeDetector' in window) {
     //   const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
     //   const detect = async () => {
     //     if (!videoRef.current || !isScanning) return;
     //     try {
     //       const barcodes = await barcodeDetector.detect(videoRef.current);
     //       if (barcodes.length > 0) {
     //         const qrCodeData = barcodes[0].rawValue;
     //         console.log('QR Code detectado:', qrCodeData); // Translated
     //         setIsScanning(false);
     //         router.push(`/plant/${qrCodeData}`);
     //       } else if (isScanning) {
     //         requestAnimationFrame(detect); // Keep scanning
     //       }
     //     } catch (error) {
     //       console.error('Erro na detecção do código de barras:', error); // Translated
     //       setScanError('Falha ao detectar QR code.'); // Translated
     //       // Optionally stop scanning on error: setIsScanning(false);
     //       if (isScanning) requestAnimationFrame(detect); // Or keep trying
     //     }
     //   };
     //   requestAnimationFrame(detect);
     // } else {
     //   console.warn('API de Detecção de Código de Barras não suportada.'); // Translated
     //   setScanError('Seu navegador não suporta escaneamento de QR code nativo.'); // Translated
     //   setIsScanning(false); // Stop if API not supported
     // }
     // ---------------------------------------------

     // Simulate finding a QR code after a delay for now
     console.log("Simulando escaneamento...");
     await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate scanning time
     if (isScanning) { // Check if user cancelled
        const simulatedQrCode = 'plant123';
        console.log(`QR Code simulado encontrado: ${simulatedQrCode}`); // Translated
        toast({
           title: 'QR Code Encontrado (Simulado)', // Translated
           description: `Navegando para a planta ${simulatedQrCode}...`, // Translated
         });
        setIsScanning(false);
        router.push(`/plant/${simulatedQrCode}`);
     }
  };


  const handleScanClick = () => {
    // Reset state before starting
    setScanError(null);
    startScan();
  };


  const handleRegister = () => {
    console.log('Navegar para a página de registro...'); // Translated
    toast({
      title: 'Funcionalidade Indisponível', // Translated
      description: 'A página de cadastro de plantas ainda não foi implementada.', // Translated
      variant: 'default', // Changed to default for info
    });
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
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="items-center text-center">
          <Image
             data-ai-hint="cannabis leaf logo green dark"
             src="https://picsum.photos/seed/cannabis-logo-dark/100/100"
             alt="CannaLog Logo"
             width={80}
             height={80}
             className="mb-4 rounded-full"
           />
          <CardTitle className="text-3xl font-bold text-primary">
            CannaLog
          </CardTitle>
          <p className="text-muted-foreground">Seu Companheiro para Plantas de Cannabis</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6">
           <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleRegister}
            aria-label="Cadastrar Nova Planta"
            disabled={isScanning}
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            Cadastrar Planta
          </Button>
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleScanClick}
            aria-label="Escanear QR Code da Planta"
            disabled={isScanning} // Disable button while scanning dialog is potentially active
          >
            <ScanLine className="mr-2 h-6 w-6" />
            Escanear QR Code
          </Button>
           <p className="text-center text-foreground/70 text-sm mt-4">
             Cadastre uma nova planta ou escaneie o QR code de uma existente para acessar seu diário.
           </p>
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <Dialog open={isScanning} onOpenChange={handleCloseScanner}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle> {/* Translated */}
            <DialogDescription>
              Aponte a câmera para o QR code da planta. {/* Translated */}
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-md border bg-muted">
             {/* Video element must be present for BarcodeDetector */}
             <video
               ref={videoRef}
               className="h-full w-full object-cover"
               autoPlay
               muted
               playsInline // Important for mobile
             />
             {/* Overlay for visual feedback */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-3/4 border-4 border-primary/50 rounded-lg animate-pulse"></div>
              </div>

            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-destructive p-4">
                <VideoOff className="h-12 w-12 mb-2" />
                <p className="text-center font-semibold">Acesso à câmera negado</p> {/* Translated */}
                <p className="text-center text-sm">Permita o acesso nas configurações do navegador.</p> {/* Translated */}
              </div>
            )}
             {hasCameraPermission === null && ( // Loading state
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-muted-foreground p-4">
                  <Loader2 className="h-12 w-12 mb-2 animate-spin" />
                  <p className="text-center text-sm">Solicitando permissão da câmera...</p> {/* Translated */}
                </div>
             )}
          </div>
          {scanError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Erro no Escaneamento</AlertTitle> {/* Translated */}
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseScanner}>
              Cancelar {/* Translated */}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
