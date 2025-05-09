// src/app/(app)/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History,
    AlertCircle as AlertCircleIcon, Camera, Zap, Package, Home as HomeIcon, Warehouse, Seedling // Added Seedling icon
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
import { cn } from '@/lib/utils'; // Import cn
import { db } from '@/lib/firebase/client'; // Import client-side db instance
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { useAuth } from '@/context/auth-context'; // Import useAuth
import Link from 'next/link'; // Import Link for login redirect
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Progress } from "@/components/ui/progress"; // Import Progress
import { formatDistanceToNow } from 'date-fns'; // Import formatDistanceToNow
import { toDate } from 'date-fns';// Import toDate
import { ptBR } from 'date-fns/locale'; // Import ptBR locale
import { Environment } from '@/types/environment';
import { getEnvironmentsByOwner } from '@/services/environment-service';
import { addDays } from 'date-fns'; // Import addDays
// Define states for camera/scanner
type ScannerStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'initializing' | 'scanning' | 'stopped' | 'error';

export default function DashboardPage() { // Renamed component to DashboardPage
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, authError } = useAuth(); // Get user and auth status

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any | null>(null); // Using any for BarcodeDetector due to type issues
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Track mount state
  const [isScannerSupported, setIsScannerSupported] = useState(false); // State for scanner support

  // State for fetched plant data
  const [recentPlants, setRecentPlants] = useState<Plant[]>([]);
  const [attentionPlants, setAttentionPlants] = useState<Plant[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  // State for general error display
  const [error, setError] = useState<string | null>(null);

  // Determine if there's a critical initialization error (db instance unavailable or auth error)
  const isDbUnavailable = !db || !!authError;
  const [availableEnvironments, setAvailableEnvironments] = useState<Environment[]>([]); // Store fetched environments
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true); // Loading state for environments
  // Calculate progress
  const calculateProgress = (start: string | number | Date, estimatedHarvestDate: string | number | Date) => {
    const startDate = toDate(new Date(start));
    const endDate = toDate(new Date(estimatedHarvestDate));
    const now = new Date();
    if (now < startDate) return 0; // Before start date
    if (now > endDate) return 100; // After end date

    const totalTime = endDate.getTime() - startDate.getTime();
    const elapsedTime = now.getTime() - startDate.getTime();
    return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100)); // Ensure within 0-100 range
  };


  // Track mount state and check scanner support
  useEffect(() => {
    setIsMounted(true);
    // Check for BarcodeDetector support once the component is mounted on the client
    if (typeof window !== 'undefined') {
      const supported = 'BarcodeDetector' in window && typeof (window as any).BarcodeDetector !== 'undefined';
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
          barcodeDetectorRef.current = null; // Ensure it's null if failed
        }
      }
    }
    return () => setIsMounted(false);
  }, []); // Empty dependency array ensures this runs only once


   // --- Fetch Plant Data Function ---
   const fetchPlants = useCallback(async () => {
     // Check for DB availability and user authentication first
     if (isDbUnavailable || !user || authLoading) {
        setError(isDbUnavailable ? `Erro de Configuração: ${authError?.message || 'Serviço indisponível.'}` : (!user && !authLoading ? "Faça login para ver os dados das plantas." : null));
        setIsLoadingPlants(false);
        setRecentPlants([]);
        setAttentionPlants([]);
        return;
     }
     console.log(`Fetching plant data from Firestore service for user ${user.uid}...`);
     setIsLoadingPlants(true);
     setError(null); // Reset error state

     try {
       // Fetch data specific to the logged-in user
       const [fetchedRecent, fetchedAttention] = await Promise.all([
         getRecentPlants(user.uid, 5), // Fetch 5 recent plants for this user
         getAttentionPlants(user.uid, 5) // Fetch 5 attention plants for this user
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
   }, [toast, isDbUnavailable, user, authError, authLoading]); // Added authLoading dependency


    const fetchEnvironments = useCallback(async () => {
        if (!user || isDbUnavailable || authLoading) {
            setIsLoadingEnvironments(false);
            return; // Don't fetch if not ready
        }
        setIsLoadingEnvironments(true);
        try {
            const envs = await getEnvironmentsByOwner(); // Fetches environments for the current user
            setAvailableEnvironments(envs);
        } catch (e: any) {
            console.error("Failed to fetch environments for filter:", e);
            toast({ variant: 'destructive', title: 'Erro ao Carregar Filtros', description: 'Não foi possível buscar os ambientes.' });
        } finally {
            setIsLoadingEnvironments(false);
        }
    }, [user, isDbUnavailable, authLoading, toast]);

   // --- Effect to fetch plant data on mount and when dialog closes ---
   useEffect(() => {
       if (isMounted && !isDialogOpen && user && !isDbUnavailable && !authLoading) {
           console.log("Component mounted or dialog closed, user logged in, fetching plants.");
           fetchPlants();
           fetchEnvironments();
       } else if (isDbUnavailable) {
           console.log("Skipping plant fetch: DB unavailable.");
       } else if (authLoading) {
           console.log("Skipping plant fetch: Auth is loading.");
           setIsLoadingPlants(true); // Keep loading state while auth loads
       } else if (!user) {
           console.log("Skipping plant fetch: User not logged in.");
           setError("Faça login para ver os dados das plantas."); // Set error if user logs out
           setIsLoadingPlants(false);
           setRecentPlants([]);
           setAttentionPlants([]);
       } else {
           console.log(`Skipping plant fetch. Mounted: ${isMounted}, Dialog Open: ${isDialogOpen}`);
       }
   }, [isMounted, isDialogOpen, fetchPlants, user, authLoading, isDbUnavailable, fetchEnvironments]); // Add authLoading dependency


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
       // Try to get the environment-facing camera first.
       console.log("Requesting environment camera...");
       const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
       console.log("Camera permission granted (environment facing). Stream tracks:", stream.getTracks());
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
            console.log("Requesting default camera...");
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default). Stream tracks:", stream.getTracks());
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

           // Check for DB availability and user auth before Firestore check
           if (isDbUnavailable || !user) {
               console.error("DB unavailable or user not logged in during QR verification:", authError?.message);
               toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível verificar a planta (configuração ou login).' });
               setScannerStatus('error');
               setScannerError('Erro de configuração ou login ao verificar planta.');
               return; // Stop the process
           }

           try {
             // Check Firestore if plant exists AND belongs to the current user
             const plantExists = await getPlantById(qrCodeData, user.uid); // Pass user.uid
             if (plantExists) {
                 console.log(`Planta ${qrCodeData} encontrada para o usuário ${user.uid}. Redirecionando...`);
                 sessionStorage.setItem('pendingNavigationQr', qrCodeData);
                 if (handleOpenChangeCallbackRef.current) {
                   console.log("Triggering dialog close via handleOpenChange(false) after QR verification.");
                   handleOpenChangeCallbackRef.current(false); // Close dialog and navigate
                 } else {
                    console.error("handleOpenChange callback ref not set when QR code verified!");
                    setIsDialogOpen(false); // Force close as fallback
                 }
             } else {
                 console.warn(`Planta ${qrCodeData} não encontrada para o usuário ${user.uid} ou não existe.`);
                 toast({
                     variant: 'destructive',
                     title: 'Planta Não Encontrada',
                     description: `O QR code foi lido (${qrCodeData}), mas esta planta não existe ou não pertence a você.`,
                 });
                 // Keep dialog open, allow rescan
                 setScannerStatus('initializing'); // Go back to initializing to allow manual rescan/close
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
           }

         } else if (scannerStatus === 'scanning') {
            // Optional: Log if no barcode found on a scan tick
         }
       } catch (error: any) {
         if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError' || error.name === 'OperationError')) {
             console.warn('DOMException during barcode detection (likely temporary/benign):', error.message);
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
   }, [stopScanInterval, stopMediaStream, toast, isDialogOpen, scannerStatus, isDbUnavailable, user, authError]); // Added user to dependencies


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
          // Check if user is logged in
         if (!user) {
            toast({ variant: 'destructive', title: 'Login Necessário', description: 'Faça login para escanear.' });
            return;
         }

        setScannerError(null);
        setScannerStatus('idle'); // Start as idle, camera starts, then initializing
        setIsDialogOpen(true); // Set dialog open state *before* starting camera
        startCamera(); // Initiate camera start
        console.log("Dialog state set to open, camera start initiated.");

   }, [startCamera, toast, isScannerSupported, user]); // Add user dependency

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
    // Prerequisite checks (scanner support, user login) moved to handleDialogOpen
    handleOpenChange(true); // handleOpenChange calls handleDialogOpen which has the checks
  };

   const startNewCultivation = () => {
       router.push('/environments'); // Navigate to environments page to select/create an environment
   };

   // Function to format time difference
   const formatTimeSince = (date: Date) => {
       return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
   };

  // Determine if buttons should be disabled based on auth and Firebase status
  const generalDisabled = isDialogOpen || isDbUnavailable || authLoading || !user;


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

       {/* Display Global Error if Firebase Failed or Auth Failed */}
        {isDbUnavailable && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Erro Crítico de Configuração</AlertTitle>
            <AlertDescription>
              {authError?.message || 'Serviço de banco de dados indisponível.'} Algumas funcionalidades podem estar indisponíveis. Verifique o console para mais detalhes.
            </AlertDescription>
          </Alert>
        )}
        {/* Display General Fetch Error */}
        {error && !isDbUnavailable && user && ( // Only show fetch errors if logged in and no critical error
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
         {/* Auth Loading or No User Message */}
         {authLoading && !isDbUnavailable && (
             <Alert variant="default" className="mb-6 border-blue-500/50 bg-blue-500/10">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <AlertTitle>Autenticando...</AlertTitle>
                <AlertDescription>Verificando sua sessão, um momento.</AlertDescription>
             </Alert>
         )}
         {!authLoading && !user && !isDbUnavailable && ( // Show if not loading, no user, and no critical Firebase error
             <Alert variant="destructive" className="mb-6">
                 <AlertCircleIcon className="h-4 w-4" />
                 <AlertTitle>Sessão Expirada ou Inválida</AlertTitle>
                 <AlertDescription>
                    Você não está autenticado. Por favor, <Link href="/login" className="font-semibold underline hover:text-destructive-foreground">faça login</Link> para continuar.
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
                   onClick={startNewCultivation}
                   aria-label="Cadastrar Nova Planta"
                   disabled={generalDisabled}
                 >
                   <Seedling className="mr-3 h-5 w-5" />
                   Novo Cultivo
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
                                disabled={generalDisabled || !isScannerSupported}
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
                      {generalDisabled && isScannerSupported && (
                         <TooltipContent side="bottom">
                            <p>{isDbUnavailable ? 'Funcionalidade indisponível (erro DB).' : !user ? 'Faça login para escanear.' : authLoading ? 'Aguardando autenticação...' : 'Aguarde...'}</p>
                         </TooltipContent>
                      )}
                      {/* Specific tooltip if only auth is loading */}
                       {authLoading && !isDbUnavailable && isScannerSupported && (
                           <TooltipContent side="bottom">
                              <p>Aguardando autenticação...</p>
                           </TooltipContent>
                       )}
                 </Tooltip>

                 <Button
                   size="lg"
                   variant="outline"
                   className="w-full text-base font-medium button justify-start"
                   onClick={() => router.push('/plants')}
                   aria-label="Ver todas as plantas"
                   disabled={generalDisabled}
                 >
                   <Package className="mr-3 h-5 w-5" />
                   Ver Todas as Plantas
                 </Button>

                 {/* Button to Manage Environments */}
                 <Button
                   size="lg"
                   variant="outline"
                   className="w-full text-base font-medium button justify-start"
                   onClick={handleManageEnvironments}
                   aria-label="Gerenciar Ambientes"
                   disabled={generalDisabled}
                 >
                   <Warehouse className="mr-3 h-5 w-5" />
                   Gerenciar Ambientes
                 </Button>
               </CardContent>
             </Card>

              {/* Plants Needing Attention Card */}
              {/* Show skeleton only if auth is okay and user exists but plants are loading */}
              {authLoading || (!user && !authLoading) || isDbUnavailable ? null : isLoadingPlants ? (
                <Card className="shadow-md card border-destructive/30 p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-xl">Requer Atenção</CardTitle>
                   </div>
                    <div className="space-y-4">
                       <Skeleton className="h-16 w-full" />
                       <Skeleton className="h-4 w-3/4 mx-auto" />
                    </div>
                </Card>
               ) : error ? ( // Show error state if loading failed
                 <Card className="shadow-md card border-destructive/30 p-6">
                    <div className="flex items-center gap-2 mb-4">
                       <AlertTriangle className="h-5 w-5 text-destructive" />
                       <CardTitle className="text-xl">Requer Atenção</CardTitle>
                    </div>
                    <Alert variant="destructive" className="border-none p-0">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertTitle>Erro ao Carregar</AlertTitle>
                        <AlertDescription>Não foi possível buscar as plantas.</AlertDescription>
                    </Alert>
                 </Card>
                ) : ( // Show AttentionPlants only if loaded successfully
                 <AttentionPlants plants={attentionPlants} />
               )}


          </div>

           {/* Right Column (Recent Plants) */}
           <div className="lg:col-span-2">
              {/* Show skeleton only if auth is okay and user exists but plants are loading */}
              {authLoading || (!user && !authLoading) || isDbUnavailable ? null : isLoadingPlants ? (
                 <Card className="shadow-md card h-full flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Plantas Recentes</CardTitle>
                    </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                         <Skeleton className="h-20 w-full mb-4" />
                         <Skeleton className="h-20 w-full mb-4" />
                         <Skeleton className="h-20 w-full" />
                     </div>
                 </Card>
              ) : error ? ( // Show error state if loading failed
                  <Card className="shadow-md card h-full flex flex-col p-6">
                     <div className="flex items-center gap-2 mb-4">
                         <History className="h-5 w-5 text-primary" />
                         <CardTitle className="text-xl">Plantas Recentes</CardTitle>
                     </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                          <Alert variant="destructive" className="w-full">
                              <AlertCircleIcon className="h-4 w-4" />
                              <AlertTitle>Erro ao Carregar</AlertTitle>
                              <AlertDescription>Não foi possível buscar as plantas recentes.</AlertDescription>
                          </Alert>
                     </div>
                  </Card>
               ) : ( // Show RecentPlants only if loaded successfully
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

                         {/* Scan Line Animation - Updated Class */}
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-scan-line-vertical-improved"></div>

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
