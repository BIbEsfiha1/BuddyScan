
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
    Gauge, Droplet, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle,
    Activity, CalendarDays, Bot, User, FlaskConical, Loader2, RefreshCw, Layers, FileText, Clock, ClipboardList
} from '@/components/ui/lucide-icons'; // Use centralized icons
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry';
// Import Firestore functions for diary entries
import { loadDiaryEntriesFromFirestore, addDiaryEntryToFirestore } from '@/types/diary-entry';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button'; // Import Button for refresh
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase error state

interface PlantDiaryProps {
  plantId: string;
}

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the load function
  const loadEntries = useCallback(async () => {
    // Check Firebase availability before loading
    if (firebaseInitializationError) {
        setError(`Firebase não inicializado: ${firebaseInitializationError.message}`);
        setIsLoading(false);
        return;
    }
     if (!plantId) {
       console.warn("loadEntries called without plantId.");
       setError("ID da planta não fornecido para carregar o diário.");
       setIsLoading(false);
       return;
     }

    console.log(`Loading entries for plant ${plantId} from Firestore...`);
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEntries = await loadDiaryEntriesFromFirestore(plantId); // Use Firestore function
      console.log(`Loaded ${fetchedEntries.length} entries from Firestore.`);
      setEntries(fetchedEntries); // Already sorted by Firestore query
    } catch (err: any) {
      console.error('Falha ao buscar entradas do diário no Firestore:', err);
      setError(`Não foi possível carregar as entradas do diário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  }, [plantId]); // Dependency is plantId

  useEffect(() => {
    console.log("PlantDiary useEffect triggered for plantId:", plantId);
    loadEntries(); // Load entries when plantId changes or component mounts
    // No cleanup needed here unless there were subscriptions
  }, [loadEntries]); // Run effect when loadEntries changes (due to plantId change)

   // Handler for when DiaryEntryForm submits a new entry
   // This function is called by DiaryEntryForm AFTER it successfully saves to Firestore
   const handleNewEntry = (newlyAddedEntry: DiaryEntry) => {
       console.log('Handling new entry in PlantDiary (already saved to Firestore):', newlyAddedEntry);
       // Optimistically update the local state
       // Add the new entry to the beginning (assuming Firestore returns the added doc)
       setEntries(prevEntries => [newlyAddedEntry, ...prevEntries]);
       // No need to re-sort if Firestore query sorts and we prepend
   };


  return (
    <div className="space-y-8">
      {/* Show form, disable if Firebase has init errors */}
      <DiaryEntryForm
        plantId={plantId}
        onNewEntry={handleNewEntry}
        // Pass disabled state based on Firebase init error
        // (Need to add a disabled prop to DiaryEntryForm if not already present)
        // disabled={!!firebaseInitializationError}
      />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b pb-3 pt-4 px-4 md:px-6"> {/* Slightly more padding */}
            <div>
                <CardTitle className="text-2xl flex items-center gap-2"><History className="h-6 w-6 text-primary"/>Histórico do Diário</CardTitle> {/* Updated Icon */}
                <CardDescription>Registro cronológico de observações e ações.</CardDescription>
            </div>
             <Button variant="outline" size="sm" onClick={loadEntries} disabled={isLoading || !!firebaseInitializationError} className="button">
                 {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                 {isLoading ? 'Atualizando...' : 'Atualizar'}
             </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-4 md:px-6"> {/* More padding */}
          {/* Display Firebase Init Error first */}
           {firebaseInitializationError && !error && ( // Show only if no other loading error
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro de Configuração do Firebase</AlertTitle>
                <AlertDescription>{firebaseInitializationError.message}. Não é possível carregar ou salvar entradas.</AlertDescription>
              </Alert>
           )}

           {isLoading && (
              <div className="space-y-6 pt-4">
                <Skeleton className="h-56 w-full rounded-lg" /> {/* Taller skeleton */}
                <Skeleton className="h-56 w-full rounded-lg" />
              </div>
           )}
           {error && !firebaseInitializationError && ( // Show specific loading error if no init error
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Diário</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
           )}


          {!isLoading && !error && !firebaseInitializationError && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg mt-4">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-secondary/50"/> {/* Updated Icon */}
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p>
            </div>
          )}

          {/* Entries List - Only show if no errors and not loading */}
          {!isLoading && !error && !firebaseInitializationError && entries.length > 0 && (
            <div className="space-y-6 mt-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border shadow-md overflow-hidden bg-card/80 hover:shadow-lg transition-shadow card"> {/* Added hover shadow */}
                    <CardHeader className="bg-muted/40 p-3 px-4 flex flex-row justify-between items-center border-b"> {/* Added border */}
                       <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary"/> {/* Updated Icon */}
                          <span className="font-semibold text-sm text-foreground/90">
                             {/* Format date from ISO string */}
                             {entry.timestamp ? new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Data inválida'}
                          </span>
                       </div>
                      {entry.stage && <Badge variant="outline" className="text-xs px-2 py-0.5"><Layers className="inline mr-1 h-3 w-3"/>{entry.stage}</Badge>} {/* Added icon */}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Sensor/Measurement Data */}
                      {(entry.heightCm || entry.ec !== null || entry.ph !== null || entry.temp !== null || entry.humidity !== null) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3 text-sm text-muted-foreground border-b pb-4 mb-4"> {/* Increased spacing */}
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec !== null && typeof entry.ec !== 'undefined' && <div className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph !== null && typeof entry.ph !== 'undefined' && <div className="flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-secondary" /> <span>pH: {entry.ph}</span></div>}
                              {entry.temp !== null && typeof entry.temp !== 'undefined' && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity !== null && typeof entry.humidity !== 'undefined' && <div className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side */}
                       <div className="flex flex-col lg:flex-row gap-6"> {/* Increased gap */}
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
                               {/* Display Data URI directly or Cloud Storage URL */}
                               <Image
                                  data-ai-hint={entry.aiSummary ? `cannabis analysis ${entry.stage?.toLowerCase()}` : `cannabis plant ${entry.stage?.toLowerCase()} diary photo`}
                                  src={entry.photoUrl}
                                  alt={`Foto da planta em ${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('pt-BR') : ''}`}
                                  width={400}
                                  height={300}
                                  className="rounded-lg shadow-md w-full h-auto object-cover border"
                                  onError={(e) => {
                                     console.warn(`Failed to load image: ${entry.photoUrl}. Using placeholder.`);
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
                                     <h4 className="font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-secondary" /> Observações</h4> {/* Updated Icon */}
                                      <p className="pl-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                                   </div>
                                )}
                           </div>
                       </div>


                        {/* Author */}
                        <div className="text-xs text-muted-foreground text-right pt-2 border-t mt-4 flex justify-end items-center gap-1">
                           <User className="h-3.5 w-3.5"/>
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
