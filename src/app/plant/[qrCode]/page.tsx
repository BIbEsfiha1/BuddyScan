
'use client'; // Add 'use client' directive

import React, { useState, useEffect } from 'react'; // Import hooks
import { getPlantByQrCode } from '@/services/plant-id';
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Thermometer, Droplet, Activity, AlertCircle, Sprout, Warehouse, Loader2 } from 'lucide-react'; // Added Warehouse icon and Loader2
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Define expected params structure remains the same
interface PlantPageProps {
  params: {
    qrCode: string;
  };
}

// Component is now a standard function component, not async
export default function PlantPage({ params }: PlantPageProps) {
  const { qrCode } = params;
  const [plant, setPlant] = useState<Plant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    // Define the async function to fetch data inside useEffect
    const fetchPlantData = async () => {
      setIsLoading(true); // Start loading
      setError(null); // Reset error
      setPlant(null); // Reset plant data

      // Guard against running fetch if qrCode is missing (though unlikely with route structure)
      if (!qrCode) {
          console.error("QR Code is missing in params.");
          setError("Código QR inválido ou ausente.");
          setIsLoading(false);
          return;
      }

      try {
        console.log(`Fetching plant data for QR Code: ${qrCode} from service...`);
        // Fetch data using the service function (which now correctly runs client-side)
        const fetchedPlant = await getPlantByQrCode(qrCode);
        if (!fetchedPlant) {
          setError(`Planta com QR Code '${qrCode}' não encontrada no armazenamento local. Verifique se foi cadastrada corretamente.`);
          console.warn(`Plant with QR Code '${qrCode}' not found.`); // Use warn for not found
        } else {
          console.log(`Plant data fetched successfully for ${qrCode}:`, fetchedPlant);
          setPlant(fetchedPlant);
        }
      } catch (e) {
        console.error('Falha ao buscar dados da planta no serviço:', e);
        setError('Falha ao carregar dados da planta. Por favor, tente novamente mais tarde.');
      } finally {
        setIsLoading(false); // Stop loading regardless of outcome
      }
    };

    fetchPlantData(); // Call the async function

  }, [qrCode]); // Dependency array includes qrCode

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

  // --- Not Found State (handled by error state now if plant is null after loading) ---
  // Kept conceptually, but the check below is sufficient if loading completes and plant is still null
  if (!plant) {
     // This state should ideally not be reached if the error state handles null plants after loading.
     // But kept as a fallback or if error logic changes.
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
  console.log(`Rendering success state for plant: ${plant.strain} (${plant.qrCode})`);
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Card className="shadow-lg overflow-hidden border-primary/20 card">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                     <Badge variant="secondary" className="self-start sm:self-center text-base px-4 py-1.5 font-medium shadow-sm">
                        Status: {plant.status}
                    </Badge>
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
                 {/* Example placeholders for potential future data */}
                 {/*
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Thermometer className="h-5 w-5 text-secondary flex-shrink-0" />
                   <span className="text-foreground"><strong className="font-medium">Temp Média:</strong> 24°C</span>
                 </div>
                 ... etc
                 */}
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      {/* Ensure PlantDiary component exists and accepts plantId */}
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

    