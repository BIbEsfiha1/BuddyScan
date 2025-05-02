
'use client'; // Add 'use client' directive

import React, { useState, useEffect, useCallback } from 'react'; // Import hooks
import { getPlantByQrCode, updatePlantStatus, CANNABIS_STAGES } from '@/services/plant-id'; // Import update function and stages
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
  params: {
    qrCode: string;
  };
}

// Component is now a standard function component, not async
export default function PlantPage({ params }: PlantPageProps) {
  const { qrCode } = params;
  const { toast } = useToast();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(''); // Local state for status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Loading state for status update
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Fetch plant data
  useEffect(() => {
    const fetchPlantData = async () => {
      setIsLoading(true);
      setError(null);
      setPlant(null);
      setCurrentStatus(''); // Reset status

      if (!qrCode) {
          console.error("QR Code is missing in params.");
          setError("Código QR inválido ou ausente.");
          setIsLoading(false);
          return;
      }

      try {
        console.log(`Fetching plant data for QR Code: ${qrCode} from service...`);
        const fetchedPlant = await getPlantByQrCode(qrCode);
        if (!fetchedPlant) {
          setError(`Planta com QR Code '${qrCode}' não encontrada no armazenamento local. Verifique se foi cadastrada corretamente.`);
          console.warn(`Plant with QR Code '${qrCode}' not found.`);
        } else {
          console.log(`Plant data fetched successfully for ${qrCode}:`, fetchedPlant);
          setPlant(fetchedPlant);
          setCurrentStatus(fetchedPlant.status); // Initialize local status state
        }
      } catch (e) {
        console.error('Falha ao buscar dados da planta no serviço:', e);
        setError('Falha ao carregar dados da planta. Por favor, tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlantData();
  }, [qrCode]); // Dependency array includes qrCode

  // --- Handle Status Update ---
  const handleStatusChange = useCallback(async (newStatus: string) => {
     if (!plant || newStatus === currentStatus || isUpdatingStatus) {
       return; // No change or already updating
     }

     setIsUpdatingStatus(true);
     console.log(`Attempting to update status for plant ${plant.id} to ${newStatus}`);

     try {
       await updatePlantStatus(plant.id, newStatus);
       setCurrentStatus(newStatus); // Update local state on success
       setPlant(prevPlant => prevPlant ? { ...prevPlant, status: newStatus } : null); // Update plant object state too
       toast({
         title: "Status Atualizado",
         description: `O status da planta ${plant.strain} foi alterado para ${newStatus}.`,
         variant: "default",
       });
     } catch (err: any) {
       console.error('Falha ao atualizar status da planta:', err);
       toast({
         variant: "destructive",
         title: "Erro ao Atualizar Status",
         description: err.message || 'Não foi possível alterar o status da planta.',
       });
       // Optionally revert local state if needed, though keeping the selection might be better UX
       // setCurrentStatus(plant.status);
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
                 Buscando informações para o QR Code: {qrCode}
             </CardDescription>
          </Card>
        </div>
      );
  }

  // --- Error State ---
  if (error) {
    console.error(`Rendering error state: ${error}`);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-destructive/10"> {/* Added subtle gradient */}
        <Card className="w-full max-w-md text-center shadow-xl border-destructive/50 card"> {/* Added base card class */}
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
     console.log(`Rendering 'not found' state for QR Code: ${qrCode} after loading.`);
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
          <Card className="w-full max-w-md text-center shadow-lg card">
             <CardHeader>
                <Sprout className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                <CardTitle className="text-xl text-muted-foreground">Planta Não Encontrada</CardTitle>
             </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Não foi possível encontrar detalhes para o QR Code: {qrCode}. Pode ter sido removida ou o código está incorreto.</p>
                 <Button asChild variant="secondary" className="button">
                    <Link href="/">Voltar ao Painel</Link>
                </Button>
              </CardContent>
           </Card>
        </div>
      );
  }

  // --- Success State ---
  console.log(`Rendering success state for plant: ${plant.strain} (${plant.qrCode}) with status: ${currentStatus}`);
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
                               <QrCode className="h-4 w-4" /> ID: {plant.id} (QR: {plant.qrCode})
                             </CardDescription>
                         </div>
                    </div>
                    {/* Status Badge and Selector */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant="secondary" className="text-base px-3 py-1 font-medium shadow-sm flex items-center gap-1.5">
                            {/* Icon based on status? Could be added later */}
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
                    <span className="text-foreground"><strong className="font-medium">Plantada em:</strong> {new Date(plant.birthDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Warehouse className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground"><strong className="font-medium">Sala de Cultivo:</strong> {plant.growRoomId}</span>
                </div>
                 {/* Example placeholders for potential future data can remain here */}
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
