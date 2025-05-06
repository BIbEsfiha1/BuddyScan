
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
    Gauge, Droplet, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle,
    Activity, CalendarDays, Bot, User, FlaskConical, Loader2, RefreshCw, Layers, FileText, Clock, ClipboardList, History
} from '@/components/ui/lucide-icons'; // Use centralized icons, added History
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry';
// Import Firestore functions for diary entries
import { loadDiaryEntriesPaginated, addDiaryEntryToFirestore, getDiaryEntriesCollectionRef } from '@/types/diary-entry'; // Use paginated load function
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button'; // Import Button for refresh
import { firebaseInitializationError } from '@/lib/firebase/config'; // firebaseInitializationError is now an Error object or null
import { useAuth } from '@/context/auth-context'; // Import useAuth to potentially map author IDs later
import type { QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore'; // Import Firestore types
import { query, orderBy, limit as firestoreLimit, startAfter, getDocs } from 'firebase/firestore';


interface PlantDiaryProps {
  plantId: string;
}

const ENTRIES_PER_PAGE = 10; // Number of diary entries to load per page

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVisibleEntry, setLastVisibleEntry] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const { user: currentUser, authError } = useAuth(); // Get current user for display purposes if needed

  // Determine the current Firebase error state
  const currentFirebaseError = firebaseInitializationError || authError;

  // Use useCallback to memoize the load function
  const loadEntries = useCallback(async (loadMore = false) => {
    // Check Firebase availability before loading
    if (currentFirebaseError) {
        setError(`Firebase não inicializado: ${currentFirebaseError.message}`);
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
    }
     if (!plantId) {
       console.warn("loadEntries called without plantId.");
       setError("ID da planta não fornecido para carregar o diário.");
       setIsLoading(false);
       setIsFetchingMore(false);
       return;
     }

    console.log(`Loading entries for plant ${plantId}... Load More: ${loadMore}, Last Visible:`, lastVisibleEntry?.id);
    if (!loadMore) {
        setIsLoading(true);
        setEntries([]); // Reset entries on initial load/refresh
        setLastVisibleEntry(null); // Reset cursor
        setHasMoreEntries(true); // Assume more on initial load
    } else {
        setIsFetchingMore(true);
    }
    setError(null);

    try {
      const diaryEntriesCollection = getDiaryEntriesCollectionRef(plantId);
      let q = query(diaryEntriesCollection, orderBy('timestamp', 'desc'), firestoreLimit(ENTRIES_PER_PAGE)); // Order by Firestore timestamp

      if (lastVisibleEntry && loadMore) { // Ensure lastVisibleEntry is used only for loadMore
          q = query(q, startAfter(lastVisibleEntry));
      }

      const querySnapshot = await getDocs(q);

      const fetchedEntries: DiaryEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp back to ISO string
        const timestamp = (data.timestamp as Timestamp)?.toDate?.().toISOString() || data.timestamp;

        fetchedEntries.push({
          ...data,
          id: doc.id,
          timestamp: timestamp,
        } as DiaryEntry);
      });

      const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      console.log(`Carregadas ${fetchedEntries.length} entradas do diário. Próxima página começa após: ${newLastVisible?.id}`);

      setEntries(prevEntries => loadMore ? [...prevEntries, ...fetchedEntries] : fetchedEntries);
      setLastVisibleEntry(newLastVisible);
      setHasMoreEntries(fetchedEntries.length === ENTRIES_PER_PAGE);

    } catch (err: any) {
      console.error('Falha ao buscar entradas do diário no Firestore:', err);
      setError(`Não foi possível carregar as entradas do diário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [plantId, lastVisibleEntry, currentFirebaseError]); // Dependency array includes plantId and the pagination cursor and firebase error state

  // Load initial entries on mount or when plantId changes
  useEffect(() => {
    console.log("PlantDiary useEffect triggered for initial load, plantId:", plantId);
    if (plantId && !currentFirebaseError) { // Only load if plantId is valid and no Firebase error
        loadEntries(false);
    } else if (currentFirebaseError) {
        setIsLoading(false); // Stop loading if there's a Firebase error
        setError(`Firebase não inicializado: ${currentFirebaseError.message}`);
    }
  }, [plantId, currentFirebaseError, loadEntries]); // Re-run if plantId or firebase error state changes


   // Handler for when DiaryEntryForm submits a new entry
   // This function is called by DiaryEntryForm AFTER it successfully saves to Firestore
   const handleNewEntry = (newlyAddedEntry: DiaryEntry) => {
       console.log('Handling new entry in PlantDiary (already saved to Firestore):', newlyAddedEntry);
       // Optimistically update the local state by prepending the new entry
       setEntries(prevEntries => [newlyAddedEntry, ...prevEntries]);
       // Optional: Consider if prepending messes up pagination logic if user immediately loads more.
       // A full refresh might be safer, or adjust `lastVisibleEntry` if needed.
       // For simplicity, we prepend here.
   };

    // Helper function to display author information
    const getAuthorDisplayName = (authorId: string): string => {
        // For now, just show the first part of the UID or a placeholder
        // In a real app, you might fetch user profiles based on authorId
        if (!authorId) return 'Desconhecido';
        // Could check against currentUser?.uid, but entries might be from others
        if (currentUser && currentUser.uid === authorId) {
             return currentUser.displayName || currentUser.email?.split('@')[0] || `Usuário (${authorId.substring(0, 6)}...)`; // Use display name or email prefix
        }
        return `Usuário (${authorId.substring(0, 6)}...)`;
    };


  return (
    <div className="space-y-8">
      {/* Diary Entry Form */}
      <DiaryEntryForm
        plantId={plantId}
        onNewEntry={handleNewEntry}
        // Pass disabled state based on Firebase init error (prop needs to be added to form)
        // disabled={!!currentFirebaseError}
      />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b pb-3 pt-4 px-4 md:px-6">
            <div>
                <CardTitle className="text-2xl flex items-center gap-2"><History className="h-6 w-6 text-primary"/>Histórico do Diário</CardTitle>
                <CardDescription>Registro cronológico de observações e ações.</CardDescription>
            </div>
             <Button variant="outline" size="sm" onClick={() => loadEntries(false)} disabled={isLoading || isFetchingMore || !!currentFirebaseError} className="button">
                 {isLoading && !isFetchingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                 {isLoading && !isFetchingMore ? 'Atualizando...' : 'Atualizar'}
             </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-4 md:px-6">
          {/* Display Firebase Init Error */}
           {currentFirebaseError && (
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                <AlertDescription>{currentFirebaseError.message}. Não é possível carregar ou salvar entradas.</AlertDescription>
              </Alert>
           )}

           {/* Loading Skeletons for initial load */}
           {isLoading && !isFetchingMore && !currentFirebaseError &&(
              <div className="space-y-6 pt-4">
                {[...Array(3)].map((_, i) => ( // Show 3 skeletons
                    <Skeleton key={i} className="h-56 w-full rounded-lg" />
                ))}
              </div>
           )}

           {/* Error Message */}
           {error && !isLoading && !currentFirebaseError &&(
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Diário</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                  <Button onClick={() => loadEntries(false)} variant="secondary" size="sm" className="mt-3 button">
                      Tentar Novamente
                  </Button>
              </Alert>
           )}

          {/* No Entries Message */}
          {!isLoading && !error && !currentFirebaseError && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg mt-4">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-secondary/50"/>
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p>
            </div>
          )}

          {/* Entries List - Only show if no errors and not loading initially */}
          {!isLoading && !error && !currentFirebaseError && entries.length > 0 && (
            <div className="space-y-6 mt-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border shadow-md overflow-hidden bg-card/80 hover:shadow-lg transition-shadow card">
                    <CardHeader className="bg-muted/40 p-3 px-4 flex flex-row justify-between items-center border-b">
                       <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary"/>
                          <span className="font-semibold text-sm text-foreground/90">
                             {entry.timestamp ? new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Data inválida'}
                          </span>
                       </div>
                      {entry.stage && <Badge variant="outline" className="text-xs px-2 py-0.5"><Layers className="inline mr-1 h-3 w-3"/>{entry.stage}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Sensor/Measurement Data */}
                      {(entry.heightCm || entry.ec !== null || entry.ph !== null || entry.temp !== null || entry.humidity !== null) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3 text-sm text-muted-foreground border-b pb-4 mb-4">
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec !== null && typeof entry.ec !== 'undefined' && <div className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph !== null && typeof entry.ph !== 'undefined' && <div className="flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-secondary" /> <span>pH: {entry.ph}</span></div>}
                              {entry.temp !== null && typeof entry.temp !== 'undefined' && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity !== null && typeof entry.humidity !== 'undefined' && <div className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side */}
                       <div className="flex flex-col lg:flex-row gap-6">
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
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
                                     <h4 className="font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-secondary" /> Observações</h4>
                                      <p className="pl-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                                   </div>
                                )}
                           </div>
                       </div>


                        {/* Author */}
                        <div className="text-xs text-muted-foreground text-right pt-2 border-t mt-4 flex justify-end items-center gap-1">
                           <User className="h-3.5 w-3.5"/>
                            Registrado por: <span className="font-medium" title={entry.authorId}>
                                {getAuthorDisplayName(entry.authorId)} {/* Use helper function */}
                           </span>
                        </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

            {/* Load More Button */}
             {!isLoading && entries.length > 0 && hasMoreEntries && !currentFirebaseError && (
               <div className="text-center mt-6 py-4 border-t">
                   <Button
                       onClick={() => loadEntries(true)}
                       disabled={isFetchingMore || !!currentFirebaseError}
                       variant="secondary"
                       className="button"
                   >
                     {isFetchingMore ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                       </>
                     ) : (
                       'Carregar Entradas Anteriores'
                     )}
                   </Button>
               </div>
             )}

             {/* End of List Indicator */}
             {!isLoading && !hasMoreEntries && entries.length > 0 && !currentFirebaseError && (
                 <p className="text-center text-muted-foreground text-sm mt-6 py-4 border-t">Fim do histórico.</p>
             )}

        </CardContent>
      </Card>
    </div>
  );
}
