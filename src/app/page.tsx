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
const mockRecentPlants = [
    { id: 'plant123', qrCode: 'plant123', strain: 'Variedade Exemplo', status: 'Crescendo', lastUpdated: 'Ontem', photoUrl: 'https://picsum.photos/seed/cannabis-veg-healthy-day1/100/100' },
    { id: 'plant456', qrCode: 'plant456', strain: 'Outra Cepa', status: 'Florindo', lastUpdated: '2 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-flowering-early/100/100' },
    // Add more mock plants
];

const mockAttentionPlants = [
    { id: 'plant789', qrCode: 'plant789', strain: 'Cepa Problema', status: 'Crescendo', attentionReason: 'Deficiência de Nutrientes (N)', lastUpdated: '3 dias atrás', photoUrl: 'https://picsum.photos/seed/cannabis-nitrogen-deficiency/100/100' },
    { id: 'plant012', qrCode: 'plant012', strain: 'White Widow', status: 'Florindo', attentionReason: 'Umidade Alta Detectada', lastUpdated: 'Hoje', photoUrl: 'https://picsum.photos/seed/cannabis-high-humidity/100/100' },
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

  // --- Camera Permission Logic (Keep as is) ---
   useEffect(() => {
     const getCameraPermission = async () => {
       if (hasCameraPermission === null || hasCameraPermission === false) {
          setScanError(null);
         try {
           streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
           setHasCameraPermission(true);
           if (videoRef.current) {
             videoRef.current.srcObject = streamRef.current;
           }
         } catch (error) {
           console.error('Erro ao acessar a câmera:', error);
           setHasCameraPermission(false);
           setScanError('Permissão da câmera negada. Habilite nas configurações do navegador.');
            toast({
              variant: 'destructive',
              title: 'Acesso à Câmera Negado',
              description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
            });
         }
       }
     };

     if (isScanning && hasCameraPermission === null) {
         getCameraPermission();
     }

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
   }, [isScanning, hasCameraPermission, toast]);
  // --- End Camera Permission Logic ---


  // --- Scan/Register Logic (Keep as is, simplified for brevity) ---
   const startScan = async () => {
      setScanError(null);
      setIsScanning(true);

      if (hasCameraPermission !== true) {
         // Logic to request permission if needed (simplified)
         console.log("Solicitando permissão da câmera...");
          try {
              streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              setHasCameraPermission(true);
              if (videoRef.current) {
                  videoRef.current.srcObject = streamRef.current;
              }
          } catch (error) {
              console.error('Erro ao acessar a câmera no início:', error);
              setHasCameraPermission(false);
              setScanError('Permissão da câmera negada.');
              toast({ variant: 'destructive', title: 'Acesso à Câmera Negado' });
              setIsScanning(false);
              return;
          }
      }

       // Actual QR Code Detection Logic (Simplified - assuming permission is now granted or was already)
        if ('BarcodeDetector' in window && videoRef.current) {
          try {
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            const detect = async () => {
              if (!videoRef.current || videoRef.current.readyState < 2 || !isScanning) {
                  if(isScanning) requestAnimationFrame(detect);
                  return;
              }
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0 && isScanning) {
                  const qrCodeData = barcodes[0].rawValue;
                  console.log('QR Code detectado:', qrCodeData);
                  toast({ title: 'QR Code Detectado', description: `Navegando para a planta ${qrCodeData}...` });
                  setIsScanning(false);
                  router.push(`/plant/${qrCodeData}`);
                } else if (isScanning) {
                  requestAnimationFrame(detect);
                }
              } catch (error: any) {
                 console.error('Erro na detecção do código de barras:', error);
                 if (isScanning && !scanError) {
                     setScanError(`Falha ao escanear: ${error.message || 'Erro desconhecido'}`);
                 }
                 if (isScanning) requestAnimationFrame(detect);
              }
            };
            requestAnimationFrame(detect);
          } catch (error: any) {
              console.error("Falha ao inicializar BarcodeDetector:", error);
              setScanError(`API de escaneamento não suportada ou falhou: ${error.message}`);
              setIsScanning(false);
          }
        } else if (isScanning) {
          console.warn('API de Detecção de Código de Barras não suportada ou câmera não pronta.');
          setScanError('Seu navegador não suporta escaneamento ou a câmera não está pronta.');
          setIsScanning(false);
        }
   };

   const handleScanClick = () => {
    setScanError(null);
     if (hasCameraPermission !== true) {
         const requestAndScan = async () => {
             try {
                 streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                 setHasCameraPermission(true);
                 if (videoRef.current) {
                     videoRef.current.srcObject = streamRef.current;
                 }
                 // Need to set isScanning true *after* permission potentially granted to show dialog
                 setIsScanning(true);
                 // Delay slightly to ensure video srcObject is set before scan starts
                 setTimeout(() => startScan(), 100);
             } catch (error) {
                 console.error('Erro ao acessar a câmera ao clicar:', error);
                 setHasCameraPermission(false);
                 setScanError('Permissão da câmera negada.');
                 toast({ variant: 'destructive', title: 'Acesso à Câmera Negado'});
                 setIsScanning(false);
             }
         };
         // Don't open dialog immediately, wait for permission attempt
          requestAndScan();
     } else {
         setIsScanning(true); // Open dialog first
         startScan(); // Then start scanning
     }
   };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A página de cadastro de plantas ainda não foi implementada.',
      variant: 'default',
    });
    // router.push('/register-plant');
  };

   const handleCloseScanner = () => {
      setIsScanning(false);
       if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
       }
       if (videoRef.current) {
         videoRef.current.srcObject = null;
       }
       setScanError(null);
       console.log("Scanner dialog closed and camera stopped.");
   };
  // --- End Scan/Register Logic ---

  return (
     // Changed background gradient, added more padding
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gradient-to-b from-background via-card/20 to-background text-foreground">
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
                   disabled={isScanning}
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
                   disabled={isScanning}
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

      {/* Scanner Dialog (Keep as is) */}
      <Dialog open={isScanning} onOpenChange={handleCloseScanner}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] dialog-content">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>
              Aponte a câmera para o QR code da planta. O escaneamento iniciará automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
             <video
               ref={videoRef}
               className={`h-full w-full object-cover transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`}
               autoPlay
               muted
               playsInline
             />
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`}>
                   <div className="w-[70%] h-[70%] border-4 border-primary/70 rounded-lg shadow-lg" style={{
                       boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)',
                   }}>
                   </div>
              </div>
            {(hasCameraPermission === null || hasCameraPermission === false) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 text-center p-4 rounded-lg">
                {hasCameraPermission === null ? (
                  <>
                    <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                    <p className="text-lg font-semibold">Aguardando Câmera...</p>
                    <p className="text-muted-foreground text-sm mt-1">Solicitando permissão de acesso.</p>
                  </>
                ) : (
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
