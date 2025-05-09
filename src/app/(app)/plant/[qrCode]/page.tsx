// src/app/(app)/plant/[qrCode]/page.tsx
'use client'; // Add 'use client' directive

import React, { useState, useEffect, useCallback, use } from 'react'; // Import hooks including 'use'
import { getPlantById, updatePlantStatus, PLANT_STATES } from '@/services/plant-id'; // Import Firestore functions and PLANT_STATES
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Leaf, QrCode, CalendarDays, Warehouse, Loader2, AlertCircle, Sprout, Pencil, Home as HomeIcon, Archive, Clock, Info // Added Info icon
} from '@/components/ui/lucide-icons'; // Use centralized icons
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { db } from '@/lib/firebase/client'; // Import client-side db instance
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { getEnvironmentById } from '@/services/environment-service'; // Import function to get environment details
import type { Environment } from '@/types/environment'; // Import Environment type

// Define expected params structure
interface PlantPageProps {
  params: Promise<{ // Mark params as a Promise
    qrCode: string;
  }>;
}

// Component is now a standard function component, not async
export default function PlantPage({ params }: PlantPageProps) {
  // Use React.use to unwrap the params Promise
  const resolvedParams = use(params);
  const { qrCode: plantId } = resolvedParams; // Use qrCode as plantId
  const { toast } = useToast();
  const { user, loading: authLoading, authError } = useAuth(); // Get user and auth status

  const [plant, setPlant] = useState<Plant | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null); // State for environment details
  const [isLoadingEnvironment, setIsLoadingEnvironment] = useState(false); // Loading state for environment
  const [currentStatus, setCurrentStatus] = useState<string>(''); // Local state for status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Loading state for status update
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for plant data

  // Determine if there's a critical initialization error
  const isDbUnavailable = !db || !!authError;


  // Fetch plant data and then environment data
  useEffect(() => {
    const fetchPlantAndEnvData = async () => {
      setIsLoading(true);
      setError(null);
      setPlant(null);
      setEnvironment(null);
      setCurrentStatus('');

      if (!plantId) {
          setError("ID da planta inválido ou ausente.");
          setIsLoading(false);
          return;
      }

      if (isDbUnavailable) {
          setError(`Erro de Configuração: ${authError?.message || 'Serviço indisponível.'}`);
          setIsLoading(false);
          return;
      }

      if (!authLoading && !user) {
           setError("Usuário não autenticado. Faça login para ver os detalhes da planta.");
           setIsLoading(false);
           return;
      }

      // Fetch Plant Data
      try {
        console.log(`Fetching plant data for ID: ${plantId} from Firestore...`);
        const fetchedPlant = await getPlantById(plantId, user?.uid); // Pass user?.uid for owner check
        if (!fetchedPlant) {
          setError(`Planta com ID '${plantId}' não encontrada ou não pertence a você.`);
          setIsLoading(false);
          return;
        }
        console.log(`Plant data fetched successfully for ${plantId}:`, fetchedPlant);
        setPlant(fetchedPlant);
        setCurrentStatus(fetchedPlant.status);

        // Fetch Environment Data if plant has growRoomId
        if (fetchedPlant.growRoomId) {
          setIsLoadingEnvironment(true);
          console.log(`Fetching environment data for ID: ${fetchedPlant.growRoomId}...`);
          try {
             const fetchedEnv = await getEnvironmentById(fetchedPlant.growRoomId); // Service handles owner check implicitly
             setEnvironment(fetchedEnv); // Might be null if not found or not owned
             console.log("Environment data fetched:", fetchedEnv);
          } catch (envError: any) {
              console.error(`Failed to fetch environment ${fetchedPlant.growRoomId}:`, envError);
              // Don't block page load for environment error, just show N/A
          } finally {
              setIsLoadingEnvironment(false);
          }
        }

      } catch (e) {
        console.error('Falha ao buscar dados da planta no Firestore:', e);
         setError(`Falha ao carregar dados da planta: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
      } finally {
        setIsLoading(false); // Plant loading finished
      }
    };

    // Only fetch if user is resolved and db is available
    if (!authLoading && !isDbUnavailable) {
      fetchPlantAndEnvData();
    } else if (isDbUnavailable) {
       setIsLoading(false); // Don't attempt to load if Firebase is not okay
    } else {
        // Wait for auth to resolve
        setIsLoading(true);
    }
  }, [plantId, isDbUnavailable, user, authLoading, authError]); // Rerun if plantId, user, or error state changes


  // --- Handle Status Update ---
  const handleStatusChange = useCallback(async (newStatus: string) => {
     if (!plant || newStatus === currentStatus || isUpdatingStatus) {
       return; // No change or already updating
     }

     if (isDbUnavailable) {
         toast({ variant: 'destructive', title: 'Erro de Configuração', description: authError?.message || 'Serviço indisponível.' });
         return;
     }
     if (!user) {
         toast({ variant: 'destructive', title: 'Não Autenticado', description: 'Faça login para alterar o status.' });
         return;
     }
     // Owner check happens within updatePlantStatus service function now


     setIsUpdatingStatus(true);
     console.log(`Attempting to update status for plant ${plant.id} to ${newStatus} in Firestore`);

     try {
       await updatePlantStatus(plant.id, newStatus, user.uid); // Pass user.uid for owner check
       setCurrentStatus(newStatus); // Update local state on success
       setPlant(prevPlant => prevPlant ? { ...prevPlant, status: newStatus } : null); // Update plant object state too
       toast({
         title: "Status Atualizado",
         description: `O status da planta ${plant.strain} foi alterado para ${newStatus}.`,
         variant: "default",
       });
     } catch (err: any) {
       console.error('Falha ao atualizar status da planta no Firestore:', err);
       toast({
         variant: "destructive",
         title: "Erro ao Atualizar Status",
         description: err.message || 'Não foi possível alterar o status da planta.',
       });
       // Optionally revert local state if update fails
       // setCurrentStatus(plant.status);
     } finally {
       setIsUpdatingStatus(false);
     }
   }, [plant, currentStatus, isUpdatingStatus, toast, isDbUnavailable, user, authError]);


  // --- Loading State ---
  if (isLoading || authLoading) { // Show loading if plant data or auth is loading
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-primary/10">
          <Card className="w-full max-w-md text-center shadow-lg card p-6">
             <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
             <CardTitle className="text-xl text-muted-foreground">
                {authLoading ? "Verificando autenticação..." : `Carregando dados para ${plantId}...`}
             </CardTitle>
             <CardDescription className="text-muted-foreground mt-2">
                 Buscando informações...
             </CardDescription>
          </Card>
        </div>
      );
  }

  // --- Error State (including DB/auth errors or general errors) ---
  const displayError = isDbUnavailable ? (authError?.message || 'Serviço de banco de dados indisponível.') : error || (!authLoading && !user ? "Usuário não autenticado." : null);

  if (displayError) {
      console.error(`Rendering error state: ${displayError}`);
      const isCriticalError = isDbUnavailable;
      const errorTitle = isCriticalError ? "Erro Crítico de Configuração" : "Erro ao Carregar Planta";

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-destructive/10">
          <Card className="w-full max-w-md text-center shadow-xl border-destructive/50 card">
             <CardHeader>
               <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit mb-3">
                  <AlertCircle className="h-10 w-10 text-destructive" />
               </div>
               <CardTitle className="text-destructive text-2xl">{errorTitle}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <p className="text-muted-foreground">{displayError}</p>
                <Button asChild variant="secondary" className="button">
                    <Link href="/dashboard">Voltar ao Painel</Link>
                </Button>
             </CardContent>
           </Card>
        </div>
      );
  }


  // --- Not Found State ---
  if (!plant) { // This should only be reached if loading is done, no error, but plant is null
     console.log(`Rendering 'not found' state for Plant ID: ${plantId} after loading.`);
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
          <Card className="w-full max-w-md text-center shadow-lg card">
             <CardHeader>
                <Sprout className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                <CardTitle className="text-xl text-muted-foreground">Planta Não Encontrada</CardTitle>
             </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Não foi possível encontrar detalhes para a planta com ID: {plantId}. Pode ter sido removida, o ID/QR Code está incorreto, ou você não tem permissão para vê-la.</p>
                 <Button asChild variant="secondary" className="button">
                    <Link href="/dashboard">Voltar ao Painel</Link>
                </Button>
              </CardContent>
           </Card>
        </div>
      );
  }

  // --- Success State ---
  console.log(`Rendering success state for plant: ${plant.strain} (${plant.id}) with status: ${currentStatus}`);
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Card className="shadow-lg overflow-hidden border-primary/20 card">
            <CardHeader className="bg-gradient-to-r from-card to-muted/30 p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Plant Title and Info */}
                    <div className="flex items-center gap-4">
                         <div className="bg-primary/10 p-3 rounded-lg shadow-inner">
                            <Leaf className="h-8 w-8 text-primary" />
                         </div>
                         <div>
                            <CardTitle className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                               {plant.strain}
                             </CardTitle>
                             <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                               <QrCode className="h-4 w-4" /> ID: {plant.id}
                             </CardDescription>
                              <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                                <Archive className="h-4 w-4" /> Lote: {plant.lotName || 'N/A'}
                             </CardDescription>
                         </div>
                    </div>
                    {/* Status Badge and Selector */}
                    <div className="flex items-center gap-2 self-start sm:self-center mt-2 sm:mt-0">
                        <Badge variant={currentStatus === 'Em tratamento' || currentStatus === 'Diagnóstico Pendente' ? 'destructive' : 'secondary'} className="text-base px-3 py-1 font-medium shadow-sm flex items-center gap-1.5">
                            Status: {currentStatus}
                        </Badge>
                        {/* Status Change Select */}
                        <Select
                            value={currentStatus}
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingStatus || isDbUnavailable || !user}
                        >
                            <SelectTrigger
                                className="w-auto h-9 px-2 py-1 text-xs shadow-sm button focus:ring-offset-0 focus:ring-primary/50"
                                aria-label="Alterar status da planta"
                            >
                                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin"/> : <Pencil className="h-3 w-3" />}
                            </SelectTrigger>
                            <SelectContent align="end">
                                {PLANT_STATES.map((state) => (
                                    <SelectItem key={state} value={state}>
                                        {state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                {/* Planted Date */}
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <CalendarDays className="h-5 w-5 text-secondary flex-shrink-0" />
                     <span className="text-foreground"><strong className="font-medium">Plantada em:</strong> {plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Data desconhecida'}</span>
                </div>
                 {/* Environment (Grow Room) */}
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Warehouse className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground">
                        <strong className="font-medium">Ambiente:</strong> {isLoadingEnvironment ? <Loader2 className="inline h-4 w-4 animate-spin ml-1"/> : (environment?.name || plant.growRoomId || 'N/A')}
                        {environment && <span className="text-xs text-muted-foreground ml-1">({environment.type})</span>}
                        {!isLoadingEnvironment && !environment && plant.growRoomId && (
                            <Info className="inline h-3 w-3 ml-1 text-destructive" title="Ambiente não encontrado ou inacessível"/>
                         )}
                    </span>
                </div>
                 {/* Estimated Harvest Date */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                     <Clock className="h-5 w-5 text-secondary flex-shrink-0" />
                     <span className="text-foreground"><strong className="font-medium">Colheita Estimada:</strong> {plant.estimatedHarvestDate ? new Date(plant.estimatedHarvestDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Não definida'}</span>
                  </div>
                 {/* Creation Date */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                     <CalendarDays className="h-5 w-5 text-secondary flex-shrink-0" />
                     <span className="text-foreground"><strong className="font-medium">Cadastrada em:</strong> {plant.createdAt ? new Date(plant.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data desconhecida'}</span>
                  </div>
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      <PlantDiary plantId={plant.id} />

      {/* Back to Dashboard Button */}
      <div className="text-center mt-8">
           <Button asChild variant="outline" className="button">
              <Link href="/dashboard">
                 <HomeIcon className="mr-2 h-4 w-4"/>
                 Voltar ao Painel
              </Link>
          </Button>
      </div>
    </div>
  );
}
