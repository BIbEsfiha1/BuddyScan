
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
    Lightbulb, Droplet, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle,
    Activity, CalendarDays, Bot, User, TestTube2, Loader2, RefreshCw
} from 'lucide-react'; // Added User, TestTube2
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry';
// Import localStorage functions for diary entries
import { loadDiaryEntriesFromLocalStorage, addDiaryEntryToLocalStorage } from '@/types/diary-entry';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button'; // Import Button for refresh
// import { useAuth } from '@/context/auth-context'; // Remove useAuth import

interface PlantDiaryProps {
  plantId: string;
}

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { user, userId } = useAuth(); // Remove auth usage

  // Use useCallback to memoize the load function
  const loadEntries = useCallback(async () => {
    console.log(`Loading entries for plant ${plantId} from localStorage...`);
    setIsLoading(true);
    setError(null);
    try {
      // Simulate slight delay even for localStorage to mimic loading feel
      await new Promise(resolve => setTimeout(resolve, 100));
      const fetchedEntries = loadDiaryEntriesFromLocalStorage(plantId);
      console.log(`Loaded ${fetchedEntries.length} entries.`);
      setEntries(fetchedEntries);
    } catch (err: any) {
      console.error('Falha ao buscar entradas do diário no localStorage:', err); // Translated
      setError(`Não foi possível carregar as entradas do diário: ${err.message || 'Erro desconhecido'}`); // Translated & Improved message
    } finally {
      setIsLoading(false);
    }
  }, [plantId]); // Dependency is plantId

  useEffect(() => {
    console.log("PlantDiary useEffect triggered for plantId:", plantId);
    if (plantId) { // Ensure plantId is available
        loadEntries();
    } else {
        console.warn("PlantDiary mounted without a plantId.");
        setError("ID da planta não fornecido para carregar o diário.");
        setIsLoading(false);
    }
    // No cleanup needed here unless there were subscriptions
  }, [loadEntries, plantId]); // Run effect when loadEntries changes (due to plantId change) or plantId itself changes

   // Handler for when DiaryEntryForm submits a new entry
   const handleNewEntry = (newEntry: DiaryEntry) => {
       console.log('Handling new entry in PlantDiary:', newEntry);
       // The entry is already added to localStorage by the form's submit handler
       // We just need to update the local state optimistically
       setEntries(prevEntries => [newEntry, ...prevEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
   };


  return (
    <div className="space-y-8">
      {/* Always show form when authentication is disabled */}
      <DiaryEntryForm plantId={plantId} onNewEntry={handleNewEntry} />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b pb-3 pt-4 px-4">
            <div>
                <CardTitle className="text-2xl">Histórico do Diário</CardTitle>
                <CardDescription>Registro cronológico de observações e ações.</CardDescription>
            </div>
             <Button variant="outline" size="sm" onClick={loadEntries} disabled={isLoading} className="button">
                 {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                 {isLoading ? 'Atualizando...' : 'Atualizar'}
             </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 px-4">
          {isLoading && (
             <div className="space-y-6 pt-4">
               <Skeleton className="h-48 w-full rounded-lg" />
               <Skeleton className="h-48 w-full rounded-lg" />
             </div>
          )}
          {error && (
             <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Erro ao Carregar Diário</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg mt-4">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-secondary/50"/>
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p>
            </div>
          )}

          {/* Entries List */}
          {!isLoading && !error && entries.length > 0 && (
            <div className="space-y-6 mt-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border shadow-md overflow-hidden bg-card/60 card">
                    <CardHeader className="bg-muted/40 p-3 px-4 flex flex-row justify-between items-center">
                       <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary"/>
                          <span className="font-semibold text-sm text-foreground/90">
                            {new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                       </div>
                      {entry.stage && <Badge variant="outline" className="text-xs px-2 py-0.5">{entry.stage}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Sensor/Measurement Data */}
                      {(entry.heightCm || entry.ec !== null || entry.ph !== null || entry.temp !== null || entry.humidity !== null) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs text-muted-foreground border-b pb-3 mb-3">
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec !== null && typeof entry.ec !== 'undefined' && <div className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph !== null && typeof entry.ph !== 'undefined' && <div className="flex items-center gap-1.5"><TestTube2 className="h-4 w-4 text-secondary" /> <span>pH: {entry.ph}</span></div>}
                              {entry.temp !== null && typeof entry.temp !== 'undefined' && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity !== null && typeof entry.humidity !== 'undefined' && <div className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side */}
                       <div className="flex flex-col lg:flex-row gap-4">
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
                               {/* Display Data URI directly */}
                               <Image
                                  data-ai-hint={entry.aiSummary ? `cannabis analysis ${entry.stage?.toLowerCase()}` : `cannabis plant ${entry.stage?.toLowerCase()} diary photo`}
                                  src={entry.photoUrl} // Assume it's a Data URI
                                  alt={`Foto da planta em ${new Date(entry.timestamp).toLocaleDateString('pt-BR')}`}
                                  width={400}
                                  height={300}
                                  className="rounded-lg shadow-md w-full h-auto object-cover border"
                                  onError={(e) => {
                                     console.warn(`Failed to load image (data URI or URL): ${entry.photoUrl}. Using placeholder.`);
                                     (e.target as HTMLImageElement).src = `https://picsum.photos/seed/cannabis-placeholder/400/300`;
                                     (e.target as HTMLImageElement).srcset = '';
                                  }}
                                />
                             </div>
                           )}

                           {/* AI Analysis or Note */}
                           <div className={`flex-1 ${entry.photoUrl ? 'lg:w-1/2' : 'w-full'}`}>
                               {entry.aiSummary && (
                                 <Card className="bg-accent/10 border-accent shadow-sm mb-4">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-accent-foreground/90">
                                            <Bot className="h-5 w-5" /> Análise da IA
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
                                      <p className="pl-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                                   </div>
                                )}
                           </div>
                       </div>


                        {/* Author */}
                        <div className="text-xs text-muted-foreground text-right pt-2 border-t mt-4 flex justify-end items-center gap-1">
                           <User className="h-3.5 w-3.5"/>
                            {/* Display placeholder text when auth is disabled */}
                            Registrado por: <span className="font-medium" title={entry.authorId}>
                                {entry.authorId === 'guest-user' ? 'Usuário Convidado' : `Usuário (${entry.authorId.substring(0, 6)}...)`}
                           </span>
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
