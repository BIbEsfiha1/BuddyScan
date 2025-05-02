import { getPlantByQrCode } from '@/services/plant-id';
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Thermometer, Droplet, Activity, AlertCircle, Sprout } from 'lucide-react'; // Added AlertCircle and Sprout
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Define expected params structure
interface PlantPageProps {
  params: {
    qrCode: string;
  };
}

export default async function PlantPage({ params }: PlantPageProps) {
  const { qrCode } = params;
  let plant: Plant | null = null;
  let error: string | null = null;

  try {
    plant = await getPlantByQrCode(qrCode);
    if (!plant) {
      error = 'Planta não encontrada para o QR code fornecido.'; // Translated
    }
  } catch (e) {
    console.error('Falha ao buscar dados da planta:', e); // Translated
    error = 'Falha ao carregar dados da planta. Por favor, tente novamente mais tarde.'; // Translated
  }


  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-destructive/10"> {/* Added subtle gradient */}
        <Card className="w-full max-w-md text-center shadow-xl border-destructive/50 card"> {/* Added base card class */}
           <CardHeader>
             <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit mb-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
             </div>
             <CardTitle className="text-destructive text-2xl">Erro ao Carregar Planta</CardTitle> {/* Translated & Improved */}
           </CardHeader>
           <CardContent>
             <p className="text-muted-foreground">{error}</p>
           </CardContent>
         </Card>
      </div>
    );
  }

  if (!plant) {
     // This case should ideally be handled by the error block above,
     // but it's good practice for type safety. Shows a loading state.
     return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
          <Card className="w-full max-w-md text-center shadow-lg card"> {/* Added base card class */}
             <CardHeader>
                <Sprout className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" /> {/* Loading Icon */}
               <CardTitle className="text-xl text-muted-foreground">Carregando Dados da Planta...</CardTitle> {/* Translated */}
             </CardHeader>
           </Card>
        </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8"> {/* Increased spacing */}
        <Card className="shadow-lg overflow-hidden border-primary/20 card"> {/* Added base card class */}
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-6"> {/* Subtle gradient header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"> {/* Adjusted alignment */}
                    <div className="flex items-center gap-3">
                         <div className="bg-primary/10 p-3 rounded-lg"> {/* Icon background */}
                            <Leaf className="h-8 w-8 text-primary" />
                         </div>
                         <div>
                            <CardTitle className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                               {plant.strain}
                             </CardTitle>
                             <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                               <QrCode className="h-4 w-4" /> ID: {plant.id} (QR: {plant.qrCode}) {/* Translated */}
                             </CardDescription>
                         </div>
                    </div>
                     <Badge variant="secondary" className="self-start sm:self-center text-base px-4 py-1.5 font-medium shadow-sm"> {/* Larger badge */}
                        Status: {plant.status} {/* Translated */}
                    </Badge>
                </div>

            </CardHeader>

            <Separator /> {/* Separator between header and content */}

            <CardContent className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm"> {/* Adjusted grid gap */}
                {/* Info Item Component (Optional Refactor) */}
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"> {/* Hover effect */}
                    <Calendar className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground"><strong className="font-medium">Plantada em:</strong> {new Date(plant.birthDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</span> {/* Translated & Formatted */}
                </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-warehouse text-secondary flex-shrink-0"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3 6.5l8-4.2a2 2 0 0 1 2 0l8 4.2a2 2 0 0 1 1 1.85Z"/><path d="M22 22V8"/><path d="M12 22V8"/><path d="M2 22V8"/><path d="M12 13H2"/><path d="M12 8H2"/></svg>
                    <span className="text-foreground"><strong className="font-medium">Sala de Cultivo:</strong> {plant.growRoomId}</span> {/* Translated */}
                </div>
                {/* Add more details if needed - using consistent styling */}
                 {/* Example placeholders for potential future data */}
                 {/*
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Thermometer className="h-5 w-5 text-secondary flex-shrink-0" />
                   <span className="text-foreground"><strong className="font-medium">Temp Média:</strong> 24°C</span>
                 </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Droplet className="h-5 w-5 text-secondary flex-shrink-0" />
                   <span className="text-foreground"><strong className="font-medium">Umidade Média:</strong> 55%</span>
                 </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Activity className="h-5 w-5 text-secondary flex-shrink-0" />
                   <span className="text-foreground"><strong className="font-medium">Último EC:</strong> 1.8</span>
                 </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-test-tube-2 text-secondary flex-shrink-0"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg>
                   <span className="text-foreground"><strong className="font-medium">Último pH:</strong> 6.0</span>
                 </div>
                 */}
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      <PlantDiary plantId={plant.id} />
    </div>
  );
}
