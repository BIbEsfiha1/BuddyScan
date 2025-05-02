
'use client'; // Add 'use client' directive

import React, { useState, useEffect, useCallback, use } from 'react'; // Import hooks including 'use'
import { getPlantById, updatePlantStatus, CANNABIS_STAGES } from '@/services/plant-id'; // Import Firestore functions
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Warehouse, Loader2, AlertCircle, Sprout, Pencil } from 'lucide-react'; // Added Pencil icon
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

// Define expected params structure remains the same
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
  const [plant, setPlant] = useState<Plant | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(''); // Local state for status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Loading state for status update
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Fetch plant data from Firestore
  useEffect(() => {
    const fetchPlantData = async () => {
      setIsLoading(true);
      setError(null);
      setPlant(null);
      setCurrentStatus(''); // Reset status

      if (!plantId) {
          console.error("Plant ID (from QR Code) is missing in params.");
          setError("ID da planta inválido ou ausente.");
          setIsLoading(false);
          return;
      }

      try {
        console.log(`Fetching plant data for ID: ${plantId} from Firestore...`);
        const fetchedPlant = await getPlantById(plantId); // Use Firestore function
        if (!fetchedPlant) {
          setError(`Planta com ID '${plantId}' não encontrada no Firestore.`);
          console.warn(`Plant with ID '${plantId}' not found.`);
        } else {
          console.log(`Plant data fetched successfully for ${plantId}:`, fetchedPlant);
          setPlant(fetchedPlant);
          setCurrentStatus(fetchedPlant.status); // Initialize local status state
        }
      } catch (e) {
        console.error('Falha ao buscar dados da planta no Firestore:', e);
         setError(`Falha ao carregar dados da planta: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlantData();
  }, [plantId]); // Dependency array includes plantId

  // --- Handle Status Update ---
  const handleStatusChange = useCallback(async (newStatus: string) => {
     if (!plant || newStatus === currentStatus || isUpdatingStatus) {
       return; // No change or already updating
     }

     setIsUpdatingStatus(true);
     console.log(`Attempting to update status for plant ${plant.id} to ${newStatus} in Firestore`);

     try {
       await updatePlantStatus(plant.id, newStatus); // Use Firestore update function
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
     } finally {
       setIsUpdatingStatus(false);
     }
   }, [plant, currentStatus, isUpdatingStatus, toast]);


  // --- Loading State ---
  if (isLoading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-primary/10">
          <Card className="w-full max-w-md text-center shadow-lg card p-6">
             <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
             <CardTitle className="text-xl text-muted-foreground">Carregando Dados da Planta...</CardTitle>
             <CardDescription className="text-muted-foreground mt-2">
                 Buscando informações para o ID: {plantId}
             </CardDescription>
          </Card>
        </div>
      );
  }

  // --- Error State ---
  if (error) {
    console.error(`Rendering error state: ${error}`);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-destructive/10">
        <Card className="w-full max-w-md text-center shadow-xl border-destructive/50 card">
           <CardHeader>
             <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit mb-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
             </div>
             <CardTitle className="text-destructive text-2xl">Erro ao Carregar Planta</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="secondary" className="button">
                  <Link href="/">Voltar ao Painel</Link>
              </Button>
           </CardContent>
         </Card>
      </div>
    );
  }

  // --- Not Found State ---
  if (!plant) {
     console.log(`Rendering 'not found' state for Plant ID: ${plantId} after loading.`);
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
          <Card className="w-full max-w-md text-center shadow-lg card">
             <CardHeader>
                <Sprout className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                <CardTitle className="text-xl text-muted-foreground">Planta Não Encontrada</CardTitle>
             </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Não foi possível encontrar detalhes para a planta com ID: {plantId}. Pode ter sido removida ou o ID/QR Code está incorreto.</p>
                 <Button asChild variant="secondary" className="button">
                    <Link href="/">Voltar ao Painel</Link>
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
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Plant Title and Info */}
                    <div className="flex items-center gap-3">
                         <div className="bg-primary/10 p-3 rounded-lg">
                            <Leaf className="h-8 w-8 text-primary" />
                         </div>
                         <div>
                            <CardTitle className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                               {plant.strain}
                             </CardTitle>
                             <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                               <QrCode className="h-4 w-4" /> ID: {plant.id}
                             </CardDescription>
                         </div>
                    </div>
                    {/* Status Badge and Selector */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant="secondary" className="text-base px-3 py-1 font-medium shadow-sm flex items-center gap-1.5">
                            Status: {currentStatus}
                        </Badge>
                        {/* Status Change Select */}
                        <Select
                            value={currentStatus}
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingStatus}
                        >
                            <SelectTrigger
                                className="w-auto h-9 px-2 py-1 text-xs shadow-sm button focus:ring-offset-0 focus:ring-primary/50"
                                aria-label="Alterar status da planta"
                            >
                                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin"/> : <Pencil className="h-3 w-3" />}
                            </SelectTrigger>
                            <SelectContent align="end">
                                {CANNABIS_STAGES.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Calendar className="h-5 w-5 text-secondary flex-shrink-0" />
                     {/* Format date from ISO string */}
                     <span className="text-foreground"><strong className="font-medium">Plantada em:</strong> {plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Data desconhecida'}</span>
                </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Warehouse className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground"><strong className="font-medium">Sala de Cultivo:</strong> {plant.growRoomId || 'N/A'}</span>
                </div>
                 {/* Placeholder for creation date */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                     <CalendarDays className="h-5 w-5 text-secondary flex-shrink-0" />
                     <span className="text-foreground"><strong className="font-medium">Cadastrada em:</strong> {plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data desconhecida'}</span>
                  </div>
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      <PlantDiary plantId={plant.id} />

      {/* Back to Dashboard Button */}
      <div className="text-center mt-8">
           <Button asChild variant="outline" className="button">
              <Link href="/">
                 Voltar ao Painel
              </Link>
          </Button>
      </div>
    </div>
  );
}

```
    </content>
  </change>
  <change>
    <file>src/app