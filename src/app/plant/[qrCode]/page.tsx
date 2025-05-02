import { getPlantByQrCode } from '@/services/plant-id';
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Thermometer, Droplet, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      error = 'Plant not found for the given QR code.';
    }
  } catch (e) {
    console.error('Failed to fetch plant data:', e);
    error = 'Failed to load plant data. Please try again later.';
  }


  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
           <CardHeader>
             <CardTitle className="text-destructive">Error</CardTitle>
           </CardHeader>
           <CardContent>
             <p>{error}</p>
           </CardContent>
         </Card>
      </div>
    );
  }

  if (!plant) {
     // This case should ideally be handled by the error block above,
     // but it's good practice for type safety.
     return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md text-center">
             <CardHeader>
               <CardTitle>Loading...</CardTitle> {/* Or a skeleton loader */}
             </CardHeader>
           </Card>
        </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="mb-6 shadow-md overflow-hidden">
            <CardHeader className="bg-primary/10 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                           <Leaf className="h-6 w-6 md:h-7 md:w-7" />
                           {plant.strain}
                         </CardTitle>
                         <CardDescription className="text-muted-foreground flex items-center gap-1 mt-1">
                           <QrCode className="h-4 w-4" /> Plant ID: {plant.id} (QR: {plant.qrCode})
                         </CardDescription>
                    </div>
                     <Badge variant="secondary" className="self-start sm:self-center text-sm px-3 py-1">
                        Status: {plant.status}
                    </Badge>
                </div>

            </CardHeader>
            <CardContent className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" />
                    <span><strong>Planted:</strong> {new Date(plant.birthDate).toLocaleDateString()}</span>
                </div>
                 <div className="flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-warehouse text-secondary"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3 6.5l8-4.2a2 2 0 0 1 2 0l8 4.2a2 2 0 0 1 1 1.85Z"/><path d="M22 22V8"/><path d="M12 22V8"/><path d="M2 22V8"/><path d="M12 13H2"/><path d="M12 8H2"/></svg>
                    <span><strong>Grow Room:</strong> {plant.growRoomId}</span>
                </div>
                {/* Add more details if needed */}
                 {/* Example placeholders for potential future data */}
                 {/*
                 <div className="flex items-center gap-2">
                   <Thermometer className="h-5 w-5 text-secondary" />
                   <span><strong>Avg Temp:</strong> 24°C</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Droplet className="h-5 w-5 text-secondary" />
                   <span><strong>Avg Humidity:</strong> 55%</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Activity className="h-5 w-5 text-secondary" />
                   <span><strong>Last EC:</strong> 1.8</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-test-tube-2 text-secondary"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg>
                   <span><strong>Last pH:</strong> 6.0</span>
                 </div>
                 */}
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      <PlantDiary plantId={plant.id} />
    </div>
  );
}
