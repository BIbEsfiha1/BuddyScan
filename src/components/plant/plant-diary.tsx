'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Lightbulb, Droplets, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle, Activity, CalendarDays, Bot, User, TestTube2 } from 'lucide-react'; // Added CalendarDays, Bot, User, TestTube2
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry'; // Define this type
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button'; // Import Button for refresh

// Mock function to fetch diary entries - replace with actual API call
async function fetchDiaryEntries(plantId: string): Promise<DiaryEntry[]> {
  console.log(`Buscando entradas para a planta: ${plantId}`); // Translated
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800)); // Reduced delay

  // Mock Data (Updated with more cannabis-specific seeds)
  const mockEntries: DiaryEntry[] = [
      {
        id: 'entry1',
        plantId: plantId, // Use the passed plantId
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        authorId: 'user1',
        note: 'Parece saudável, regada hoje com solução nutritiva padrão (EC 1.5, pH 6.2). Crescimento vigoroso.',
        stage: 'Vegetativo - S4',
        heightCm: 30,
        ec: 1.5,
        ph: 6.2,
        temp: 23,
        humidity: 60,
        photoUrl: 'https://picsum.photos/seed/cannabis-healthy-veg-week4/400/300',
        aiSummary: null,
      },
      {
        id: 'entry2',
        plantId: plantId,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        authorId: 'user2',
        note: 'Notei um leve amarelamento nas pontas das folhas inferiores. Tirei uma foto para análise da IA. Suspeito de deficiência de N ou leve queima de nutrientes.',
        stage: 'Vegetativo - S4',
        heightCm: 32,
        ec: 1.4, // Lower EC reading
        ph: 6.1,
        temp: 24,
        humidity: 58,
        photoUrl: 'https://picsum.photos/seed/cannabis-yellow-leaf-tips/400/300',
        aiSummary: 'Leve necrose nas pontas das folhas inferiores detectada. Pode indicar sinais precoces de deficiência de nitrogênio (N) ou excesso de nutrientes (queima). Recomenda-se monitorar o EC da solução e da drenagem e ajustar a alimentação se necessário.',
      },
      {
        id: 'entry3',
        plantId: plantId,
        timestamp: new Date().toISOString(), // Today
        authorId: 'user1',
        note: 'Ajustei a solução nutritiva após a análise da IA de ontem. Reduzi EC para 1.35 e aumentei N. Verificarei a resposta.',
        stage: 'Vegetativo - S4',
        heightCm: 33,
        ec: 1.35, // Further adjusted EC
        ph: 6.0,
        temp: 23.5,
        humidity: 59,
        photoUrl: null, // No photo for this update entry
        aiSummary: null,
      },
      {
        id: 'entry4-flowering', // Entry for a different plant state for variety
        plantId: plantId,
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        authorId: 'user3',
        note: 'Início da floração, botões começando a se formar. Ajustada a luz e nutrientes para o estágio de floração.',
        stage: 'Floração - S1',
        heightCm: 45,
        ec: 1.8,
        ph: 5.9,
        temp: 22,
        humidity: 50,
        photoUrl: 'https://picsum.photos/seed/cannabis-early-flowering-buds/400/300',
        aiSummary: 'A planta entrou no estágio inicial de floração. Recomenda-se monitorar o desenvolvimento dos botões e manter os níveis ótimos de umidade e nutrientes para floração.',
      },
  ];

  // Filter entries relevant to the specific plantId if the mock data contained multiple plants
  // For this example, we assume all mock entries belong to the requested plantId for simplicity.
  // In a real scenario, your API would handle the filtering.
  return mockEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort newest first
}


interface PlantDiaryProps {
  plantId: string;
}

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] =useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the load function
  const loadEntries = useCallback(async () => {
    console.log("Executing loadEntries...");
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEntries = await fetchDiaryEntries(plantId);
      setEntries(fetchedEntries);
    } catch (err) {
      console.error('Falha ao buscar entradas do diário:', err); // Translated
      setError('Não foi possível carregar as entradas do diário. Tente atualizar a página.'); // Translated & Improved message
    } finally {
      setIsLoading(false);
    }
  }, [plantId]); // Dependency is plantId

  useEffect(() => {
    console.log("PlantDiary useEffect triggered for plantId:", plantId);
    loadEntries();
    // No cleanup needed here unless there were subscriptions
  }, [loadEntries]); // Run effect when loadEntries changes (due to plantId change)

   const handleNewEntry = (newEntry: DiaryEntry) => {
    // Add the new entry optimistically to the top
    setEntries(prevEntries => [newEntry, ...prevEntries]);
    // Optional: Re-sort if order might be affected by timestamps, though adding to front usually works
    // setEntries(prevEntries => [newEntry, ...prevEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
   };


  return (
    <div className="space-y-8"> {/* Increased spacing */}
      {/* Form to add new entry */}
       <DiaryEntryForm plantId={plantId} onNewEntry={handleNewEntry} />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card"> {/* Adjusted border, added base card class */}
        <CardHeader className="flex flex-row justify-between items-center"> {/* Flex layout for title and refresh button */}
            <div>
                <CardTitle className="text-2xl">Histórico do Diário</CardTitle> {/* Translated */}
                <CardDescription>Registro cronológico de observações e ações.</CardDescription> {/* Translated */}
            </div>
             <Button variant="ghost" size="sm" onClick={loadEntries} disabled={isLoading}>
                 {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                 {isLoading ? 'Atualizando...' : 'Atualizar'}
             </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-0"> {/* Removed top padding */}
          {isLoading && (
             <div className="space-y-6 pt-4"> {/* Wrap skeletons, add padding top */}
               <Skeleton className="h-48 w-full rounded-lg" /> {/* Slightly smaller skeleton */}
               <Skeleton className="h-48 w-full rounded-lg" />
             </div>
          )}
          {error && (
             <Alert variant="destructive" className="mt-4"> {/* Add margin top */}
                <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Diário</AlertTitle> {/* Translated */}
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg mt-4"> {/* Add margin top */}
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-secondary/50"/>
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p> {/* Translated */}
            </div>
          )}

          {/* Entries List */}
          {!isLoading && !error && entries.length > 0 && (
            <div className="space-y-6 mt-4"> {/* Add margin top */}
                {entries.map((entry) => (
                  <Card key={entry.id} className="border shadow-md overflow-hidden bg-card/60 card"> {/* Subtle bg, added base card class */}
                    <CardHeader className="bg-muted/40 p-3 px-4 flex flex-row justify-between items-center"> {/* Use flex row */}
                       <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary"/>
                          <span className="font-semibold text-sm text-foreground/90">
                            {/* Use locale from RootLayout */}
                            {new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })} {/* Formatted Date */}
                          </span>
                       </div>
                      {entry.stage && <Badge variant="outline" className="text-xs px-2 py-0.5">{entry.stage}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Sensor/Measurement Data - Improved Layout */}
                      {(entry.heightCm || entry.ec !== null || entry.ph !== null || entry.temp !== null || entry.humidity !== null) && ( // Check for null as well as undefined/0
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs text-muted-foreground border-b pb-3 mb-3">
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec !== null && <div className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph !== null && <div className="flex items-center gap-1.5"><TestTube2 className="h-4 w-4 text-secondary" /> <span>pH: {entry.ph}</span></div>}
                              {entry.temp !== null && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity !== null && <div className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side (on larger screens) */}
                       <div className="flex flex-col lg:flex-row gap-4">
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
                                <Image
                                  data-ai-hint={entry.aiSummary ? `cannabis analysis ${entry.stage?.toLowerCase()}` : `cannabis plant ${entry.stage?.toLowerCase()} diary photo`} // Contextual hint
                                  src={entry.photoUrl}
                                  alt={`Foto da planta em ${new Date(entry.timestamp).toLocaleDateString('pt-BR')}`} // Translated
                                  width={400}
                                  height={300}
                                  className="rounded-lg shadow-md w-full h-auto object-cover border" // Responsive image
                                />
                             </div>
                           )}

                           {/* AI Analysis or Note */}
                           <div className={`flex-1 ${entry.photoUrl ? 'lg:w-1/2' : 'w-full'}`}>
                               {entry.aiSummary && (
                                 <Card className="bg-accent/10 border-accent shadow-sm mb-4">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-accent-foreground/90">
                                            <Bot className="h-5 w-5" /> Análise da IA {/* Translated */}
                                        </CardTitle>
                                    </CardHeader>
                                   <CardContent className="p-3 pt-0 text-sm text-accent-foreground/80">
                                     <p>{entry.aiSummary}</p>
                                   </CardContent>
                                 </Card>
                               )}

                                {/* Note */}
                                {entry.note && (
                                   <div className="text-sm text-foreground space-y-2">
                                     <h4 className="font-semibold flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-secondary" /> Observações</h4>
                                      <p className="pl-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p> {/* Preserve whitespace */}
                                   </div>
                                )}
                           </div>
                       </div>


                        {/* Author */}
                        <div className="text-xs text-muted-foreground text-right pt-2 border-t mt-4 flex justify-end items-center gap-1">
                           <User className="h-3.5 w-3.5"/> Registrado por: <span className="font-medium">{entry.authorId}</span> {/* Translated */}
                        </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
