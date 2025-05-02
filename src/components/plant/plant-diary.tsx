'use client';

import React, { useState, useEffect } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Lightbulb, Droplets, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle, Activity } from 'lucide-react'; // Added Activity
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry'; // Define this type


// Mock function to fetch diary entries - replace with actual API call
async function fetchDiaryEntries(plantId: string): Promise<DiaryEntry[]> {
  console.log(`Buscando entradas para a planta: ${plantId}`); // Translated
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock data - in a real app, fetch from your backend
  // Translated mock data
  return [
    {
      id: 'entry1',
      plantId: plantId,
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      authorId: 'user1',
      note: 'Parece saudável, regada hoje.', // Translated
      stage: 'Vegetativo', // Translated
      heightCm: 30,
      ec: 1.5,
      ph: 6.2,
      temp: 23,
      humidity: 60,
      photoUrl: 'https://picsum.photos/seed/cannabis-veg-healthy/300/200', // Updated seed
      aiSummary: null,
    },
    {
      id: 'entry2',
      plantId: plantId,
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      authorId: 'user2',
      note: 'Notei um amarelamento nas folhas inferiores. Tirei uma foto para análise.', // Translated
      stage: 'Vegetativo', // Translated
      heightCm: 32,
      ec: 1.4,
      ph: 6.1,
      temp: 24,
      humidity: 58,
      photoUrl: 'https://picsum.photos/seed/cannabis-veg-yellowing/300/200', // Updated seed
      aiSummary: 'Leve amarelamento detectado nas folhas inferiores. Pode indicar sinais precoces de deficiência de nitrogênio. Monitore de perto.', // Translated
    },
     {
      id: 'entry3',
      plantId: plantId,
      timestamp: new Date().toISOString(), // Today
      authorId: 'user1',
      note: 'Adicionei nutrientes. A análise de IA confirmou a possível deficiência de N. Aumentei ligeiramente o N.', // Translated
      stage: 'Vegetativo', // Translated
      heightCm: 33,
      ec: 1.6,
      ph: 6.0,
      temp: 23.5,
      humidity: 59,
      photoUrl: null,
      aiSummary: null,
    },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort newest first
}


interface PlantDiaryProps {
  plantId: string;
}

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedEntries = await fetchDiaryEntries(plantId);
        setEntries(fetchedEntries);
      } catch (err) {
        console.error('Falha ao buscar entradas do diário:', err); // Translated
        setError('Não foi possível carregar as entradas do diário. Por favor, tente atualizar.'); // Translated
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [plantId]); // Reload if plantId changes

   const handleNewEntry = (newEntry: DiaryEntry) => {
    // Add the new entry optimistically or after successful save
    setEntries(prevEntries => [newEntry, ...prevEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    // In a real app, you'd POST the newEntry to your backend here
    // and potentially update the entry list based on the response.
   };


  return (
    <div className="space-y-6">
      {/* Form to add new entry */}
       <DiaryEntryForm plantId={plantId} onNewEntry={handleNewEntry} />


      {/* Display existing entries */}
      <Card className="shadow-md border-primary/20">
        <CardHeader>
          <CardTitle>Diário da Planta</CardTitle> {/* Translated */}
          <CardDescription>Registro de observações e ações para esta planta.</CardDescription> {/* Translated */}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && (
             <>
               <Skeleton className="h-40 w-full rounded-md" />
               <Skeleton className="h-40 w-full rounded-md" />
             </>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}

          {!isLoading && !error && entries.length === 0 && (
            <p className="text-muted-foreground text-center">Nenhuma entrada no diário ainda. Adicione uma acima!</p> // Translated
          )}

          {!isLoading && !error && entries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              <Card className="border shadow-sm overflow-hidden bg-card/50">
                <CardHeader className="bg-muted/30 p-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                     <span className="font-semibold text-sm text-foreground/90">
                       {/* Use locale from RootLayout */}
                       {new Date(entry.timestamp).toLocaleString()}
                     </span>
                    <Badge variant="outline" className="text-xs">{entry.stage}</Badge>
                  </div>
                 </CardHeader>
                 <CardContent className="p-4 space-y-4">
                    {/* Sensor/Measurement Data */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      {entry.heightCm && <div className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> Altura: {entry.heightCm} cm</div>} {/* Translated */}
                      {entry.ec && <div className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> EC: {entry.ec}</div>}
                      {entry.ph && <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-test-tube-2"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg> pH: {entry.ph}</div>}
                      {entry.temp && <div className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> Temp: {entry.temp}°C</div>}
                      {entry.humidity && <div className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Umidade: {entry.humidity}%</div>} {/* Translated */}
                    </div>

                   {/* Photo */}
                   {entry.photoUrl && (
                     <div className="my-4">
                        <Image
                          // Use specific hints based on entry context if possible
                          data-ai-hint={entry.note.includes('amarelamento') ? "cannabis yellow leaves" : "cannabis plant leaves stem"}
                          src={entry.photoUrl}
                          alt={`Observação da planta em ${new Date(entry.timestamp).toLocaleDateString()}`} // Translated
                          width={300}
                          height={200}
                          className="rounded-md shadow-sm mx-auto sm:mx-0"
                        />
                     </div>
                   )}

                   {/* AI Analysis */}
                   {entry.aiSummary && (
                     <Card className="bg-accent/20 border-accent">
                        <CardHeader className="p-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent-foreground/90">
                                <Microscope className="h-4 w-4" /> Análise de IA {/* Translated */}
                            </CardTitle>
                        </CardHeader>
                       <CardContent className="p-3 pt-0 text-sm text-accent-foreground/80">
                         <p>{entry.aiSummary}</p>
                       </CardContent>
                     </Card>
                   )}

                    {/* Note */}
                    {entry.note && (
                       <div className="text-sm text-foreground flex items-start gap-2 pt-2">
                         <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-secondary" />
                          <p className="flex-1">{entry.note}</p>
                       </div>
                    )}


                    <p className="text-xs text-muted-foreground text-right">Registrado por: {entry.authorId}</p> {/* Translated */}
                 </CardContent>
              </Card>
              {index < entries.length - 1 && <Separator className="my-4"/>} {/* Added margin to separator */}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
