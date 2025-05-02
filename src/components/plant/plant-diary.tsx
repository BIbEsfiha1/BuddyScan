'use client';

import React, { useState, useEffect } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Lightbulb, Droplets, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle, Activity, CalendarDays, Bot, User } from 'lucide-react'; // Added CalendarDays, Bot, User
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry'; // Define this type
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components


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
      note: 'Parece saudável, regada hoje com solução nutritiva padrão.', // Translated and expanded
      stage: 'Vegetativo - S4', // Translated
      heightCm: 30,
      ec: 1.5,
      ph: 6.2,
      temp: 23,
      humidity: 60,
      photoUrl: 'https://picsum.photos/seed/cannabis-veg-healthy-day1/400/300', // Updated seed, larger image
      aiSummary: null,
    },
    {
      id: 'entry2',
      plantId: plantId,
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      authorId: 'user2',
      note: 'Notei um leve amarelamento nas folhas inferiores, principalmente nas pontas. Tirei uma foto para análise da IA, suspeito de deficiência de N ou talvez queima de nutrientes leve.', // Translated and more detailed
      stage: 'Vegetativo - S4', // Translated
      heightCm: 32,
      ec: 1.4, // Lower EC reading
      ph: 6.1,
      temp: 24,
      humidity: 58,
      photoUrl: 'https://picsum.photos/seed/cannabis-veg-yellowing-tips/400/300', // Updated seed
      aiSummary: 'Leve amarelamento e necrose nas pontas das folhas inferiores detectados. Isso pode indicar sinais precoces de deficiência de nitrogênio (N) ou um possível excesso de nutrientes (queima). Recomenda-se monitorar o EC da solução e da drenagem e ajustar a alimentação se necessário.', // Translated and more specific AI summary
    },
     {
      id: 'entry3',
      plantId: plantId,
      timestamp: new Date().toISOString(), // Today
      authorId: 'user1',
      note: 'Ajustei a solução nutritiva após a análise da IA. Reduzi um pouco o EC geral e aumentei ligeiramente a proporção de N. Verificarei a resposta nos próximos dias.', // Translated action based on AI
      stage: 'Vegetativo - S4', // Translated
      heightCm: 33,
      ec: 1.35, // Further adjusted EC
      ph: 6.0,
      temp: 23.5,
      humidity: 59,
      photoUrl: null, // No photo for this entry
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
        setError('Não foi possível carregar as entradas do diário. Tente atualizar a página.'); // Translated & Improved message
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [plantId]); // Reload if plantId changes

   const handleNewEntry = (newEntry: DiaryEntry) => {
    // Add the new entry optimistically
    setEntries(prevEntries => [newEntry, ...prevEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
   };


  return (
    <div className="space-y-8"> {/* Increased spacing */}
      {/* Form to add new entry */}
       <DiaryEntryForm plantId={plantId} onNewEntry={handleNewEntry} />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card"> {/* Adjusted border, added base card class */}
        <CardHeader>
          <CardTitle className="text-2xl">Histórico do Diário</CardTitle> {/* Translated */}
          <CardDescription>Registro cronológico de observações e ações.</CardDescription> {/* Translated */}
        </CardHeader>
        <CardContent className="space-y-6 pt-0"> {/* Removed top padding */}
          {isLoading && (
             <div className="space-y-6"> {/* Wrap skeletons */}
               <Skeleton className="h-56 w-full rounded-lg" /> {/* Larger skeleton */}
               <Skeleton className="h-56 w-full rounded-lg" />
             </div>
          )}
          {error && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Diário</AlertTitle> {/* Translated */}
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-secondary/50"/>
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p> {/* Translated */}
            </div>
          )}

          {/* Entries List */}
          {!isLoading && !error && entries.length > 0 && (
            <div className="space-y-6">
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
                      {(entry.heightCm || entry.ec || entry.ph || entry.temp || entry.humidity) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs text-muted-foreground border-b pb-3 mb-3">
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec && <div className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph && <div className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-test-tube-2 text-secondary"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg> <span>pH: {entry.ph}</span></div>}
                              {entry.temp && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity && <div className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side (on larger screens) */}
                       <div className="flex flex-col lg:flex-row gap-4">
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
                                <Image
                                  data-ai-hint={entry.aiSummary ? "cannabis plant analysis" : "cannabis plant diary photo"} // Contextual hint
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
