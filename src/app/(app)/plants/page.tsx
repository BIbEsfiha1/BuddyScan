

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPlantsPaginated, PLANT_STATES, Plant } from '@/services/plant-id'; // Use PLANT_STATES instead of CANNABIS_STAGES
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Filter, X, ArrowRight, Sprout, Warehouse, Search, Package, ArrowLeft, AlertCircle as AlertCircleIcon } from '@/components/ui/lucide-icons'; // Added AlertCircleIcon
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { firebaseInitializationError, db } from '@/lib/firebase/config'; // firebaseInitializationError is now an Error object or null
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection, getDocs, query } from 'firebase/firestore'; // Import Firestore functions for getting rooms
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'; // Import Firestore types
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAuth } from '@/context/auth-context'; // Import useAuth

const ALL_STATUSES_VALUE = "all_statuses";
const ALL_ROOMS_VALUE = "all_rooms";
const PLANTS_PER_PAGE = 15; // Number of plants to load per page

interface Filters {
  search: string;
  status: string;
  growRoom: string;
}

export default function AllPlantsPage() {
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter
  const { user, loading: authLoading, authError } = useAuth(); // Get user and auth status

  const [allPlants, setAllPlants] = useState<Plant[]>([]); // Stores all currently loaded plants
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]); // Plants to display after client-side search filter
  const [filters, setFilters] = useState<Filters>({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true); // Assume there might be more initially
  const [allUniqueGrowRooms, setAllUniqueGrowRooms] = useState<string[]>([]); // Store all unique rooms fetched

  // Determine the current Firebase error state
  const currentFirebaseError = firebaseInitializationError || authError;


   // Function to fetch plants (paginated)
   const fetchPlants = useCallback(async (loadMore = false) => {
     if (currentFirebaseError) {
         setError(`Firebase não inicializado: ${currentFirebaseError.message}. Não é possível buscar plantas.`);
         setIsLoading(false);
         setIsFetchingMore(false);
         return;
     }
     if (!user) {
        setError("Usuário não autenticado. Faça login para visualizar as plantas.");
        setIsLoading(false);
        setIsFetchingMore(false);
        setAllPlants([]);
        setDisplayedPlants([]);
        return;
     }

     if (!loadMore) {
         setIsLoading(true);
         setAllPlants([]); // Reset plants on initial load/filter change
         setLastVisible(null); // Reset pagination cursor
         setHasMore(true); // Assume more plants available on new filter/initial load
     } else {
         setIsFetchingMore(true);
     }
     setError(null);

     try {
       console.log(`Fetching plants... Load More: ${loadMore}, Last Visible:`, lastVisible?.id);
       const result = await getAllPlantsPaginated({
         filters: {
            // Pass only status and growRoom for server-side filtering
            status: filters.status === ALL_STATUSES_VALUE ? undefined : filters.status,
            growRoom: filters.growRoom === ALL_ROOMS_VALUE ? undefined : filters.growRoom,
            search: undefined, // Search is client-side for now
         },
         limit: PLANTS_PER_PAGE,
         lastVisible: loadMore ? lastVisible : undefined,
       });

       console.log(`Fetched ${result.plants.length} plants. New Last Visible:`, result.lastVisible?.id);

       setAllPlants(prevPlants => loadMore ? [...prevPlants, ...result.plants] : result.plants);
       setLastVisible(result.lastVisible);
       setHasMore(result.plants.length === PLANTS_PER_PAGE); // If less than limit fetched, no more pages

     } catch (e) {
       console.error('Failed to fetch plant data:', e);
       const errorMsg = `Falha ao carregar plantas: ${e instanceof Error ? e.message : 'Erro desconhecido'}`;
       setError(errorMsg);
       toast({
         variant: 'destructive',
         title: 'Erro ao Carregar Plantas',
         description: errorMsg,
       });
     } finally {
       setIsLoading(false);
       setIsFetchingMore(false);
     }
   }, [filters.status, filters.growRoom, lastVisible, toast, currentFirebaseError, user]); // Dependencies for fetching based on server filters

    // Initial fetch on component mount and when user/auth status changes
    useEffect(() => {
        if(user && !authLoading && !currentFirebaseError) {
            fetchPlants(false);
            // Fetch all unique grow rooms once for the filter dropdown
            const fetchAllGrowRooms = async () => {
                if (!db) { // db might be null if firebase init failed despite currentFirebaseError being null (edge case)
                    console.warn("Firestore DB instance not available, cannot fetch grow rooms.");
                    return;
                }
                try {
                    const plantsCol = collection(db, 'plants');
                    const q = query(plantsCol); 
                    const snapshot = await getDocs(q);
                    const rooms = new Set<string>();
                    snapshot.forEach(doc => {
                        const growRoomId = doc.data().growRoomId;
                        if (growRoomId) rooms.add(growRoomId);
                    });
                    setAllUniqueGrowRooms(Array.from(rooms).sort());
                } catch (e) {
                    console.error("Failed to fetch all grow rooms:", e);
                }
            };
            fetchAllGrowRooms();
        } else if (currentFirebaseError) {
            setIsLoading(false); // Stop loading if Firebase error
            setError(`Firebase não inicializado: ${currentFirebaseError.message}. Não é possível buscar plantas.`);
        } else if (!authLoading && !user) {
            setIsLoading(false);
            setError("Usuário não autenticado. Faça login para visualizar as plantas.");
            setAllPlants([]);
            setDisplayedPlants([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFirebaseError, user, authLoading]); // Run on mount or if firebase/auth state changes

    // Fetch when server-side filters change (status, growRoom)
    useEffect(() => {
        if(user && !authLoading && !currentFirebaseError) {
            console.log("Server filters changed, fetching new data:", filters.status, filters.growRoom);
            fetchPlants(false); 
        }
    }, [filters.status, filters.growRoom, fetchPlants, user, authLoading, currentFirebaseError]); 

    // Apply client-side search filter whenever allPlants or search term changes
    useEffect(() => {
        console.log("Applying client-side search filter:", filters.search);
        if (filters.search) {
        const lowerSearch = filters.search.toLowerCase();
        setDisplayedPlants(allPlants.filter(plant =>
            plant.strain.toLowerCase().includes(lowerSearch) ||
            (plant.lotName && plant.lotName.toLowerCase().includes(lowerSearch)) // Also search by lotName
        ));
        } else {
        setDisplayedPlants(allPlants); // Show all loaded plants if search is empty
        }
    }, [filters.search, allPlants]);


  const handleFilterChange = (filterName: keyof Filters, value: string) => {
     setFilters(prevFilters => ({
        ...prevFilters,
        [filterName]: value,
     }));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  };

  const generalDisabled = isLoading || !!currentFirebaseError || authLoading || !user;


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Card */}
       <Card className="shadow-lg border-primary/10 card bg-gradient-to-r from-card to-muted/20">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-3">
                 <Package className="h-7 w-7 text-primary" /> {/* Icon */}
                 <div>
                    <CardTitle className="text-2xl md:text-3xl">Inventário de Plantas</CardTitle>
                    <CardDescription>Visualize e filtre todas as suas plantas cadastradas.</CardDescription>
                 </div>
             </div>
              <Button variant="outline" onClick={() => router.back()} className="button self-start sm:self-center"> {/* Use router.back() */}
                <ArrowLeft className="mr-2 h-4 w-4"/> {/* Icon */}
                Voltar
             </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Card */}
      <Card className="shadow-md card">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-secondary"/>
                <CardTitle className="text-xl">Filtros</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-1.5">
             <label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Search className="h-4 w-4"/> Pesquisar Variedade / Lote</label>
            <Input
              id="search-filter"
              placeholder="Nome da variedade ou lote..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
              disabled={generalDisabled}
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1.5">
             <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Sprout className="h-4 w-4"/> Filtrar por Status</label>
            <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
                disabled={generalDisabled}
            >
              <SelectTrigger id="status-filter" className="input">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES_VALUE}>Todos os Status</SelectItem>
                {PLANT_STATES.map((state) => ( // Use PLANT_STATES
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grow Room Select */}
          <div className="space-y-1.5">
              <label htmlFor="room-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Warehouse className="h-4 w-4"/> Filtrar por Sala</label>
             <Select
                value={filters.growRoom}
                onValueChange={(value) => handleFilterChange('growRoom', value)}
                disabled={generalDisabled || allUniqueGrowRooms.length === 0}
             >
               <SelectTrigger id="room-filter" className="input">
                 <SelectValue placeholder="Todas as Salas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_ROOMS_VALUE}>Todas as Salas</SelectItem>
                 {allUniqueGrowRooms.map((room, index) => (
                   <SelectItem key={index} value={room}>{room}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full lg:w-auto button"
                disabled={
                    generalDisabled || 
                    (!filters.search &&
                    filters.status === ALL_STATUSES_VALUE &&
                    filters.growRoom === ALL_ROOMS_VALUE)
                }
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plants List */}
      <Card className="shadow-md card">
        <CardHeader>
          <CardTitle>Resultados ({displayedPlants.length}{hasMore && !isLoading && !authLoading && user && !currentFirebaseError ? '+' : ''})</CardTitle>
        </CardHeader>
        <CardContent>
           {/* Firebase Init Error or Auth Loading/Error */}
            {currentFirebaseError && (
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircleIcon className="h-4 w-4" />
                     <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                     <AlertDescription>{currentFirebaseError.message}. Não é possível buscar plantas.</AlertDescription>
                 </Alert>
            )}
            {authLoading && !currentFirebaseError && (
                 <Alert variant="default" className="mb-4 border-blue-500/50 bg-blue-500/10">
                     <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                     <AlertTitle>Autenticando...</AlertTitle>
                     <AlertDescription>Aguarde enquanto verificamos sua sessão.</AlertDescription>
                 </Alert>
            )}
            {!authLoading && !user && !currentFirebaseError && (
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircleIcon className="h-4 w-4" />
                     <AlertTitle>Não Autenticado</AlertTitle>
                     <AlertDescription>Faça login para visualizar as plantas.</AlertDescription>
                 </Alert>
            )}

           {/* Loading State for plants */}
           {isLoading && !authLoading && user && !currentFirebaseError ? (
                <div className="flex justify-center items-center py-10">
                   <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
           ) : error && !currentFirebaseError && user ? ( 
                <Alert variant="destructive" className="mb-4">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Erro ao Buscar Plantas</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <Button onClick={() => fetchPlants(false)} variant="secondary" size="sm" className="mt-3 button">
                         Tentar Novamente
                     </Button>
                 </Alert>
           ) : displayedPlants.length === 0 && !hasMore && !currentFirebaseError && user ? ( 
                <p className="text-center text-muted-foreground py-10">
                    {filters.search || filters.status !== ALL_STATUSES_VALUE || filters.growRoom !== ALL_ROOMS_VALUE
                        ? 'Nenhuma planta encontrada com os filtros aplicados.'
                        : 'Nenhuma planta cadastrada ainda.'
                    }
                </p>
           ) : !currentFirebaseError && user ? ( 
                <>
                    <ul className="divide-y divide-border -mx-6">
                    {displayedPlants.map((plant, index) => (
                        <li key={index} className="py-4 group hover:bg-muted/30 rounded-md transition-colors duration-150 px-6">
                        <Link href={`/plant/${plant.id}`} className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                                <Image
                                    data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                                    src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                                    alt={`Foto de ${plant.strain}`}
                                    width={60}
                                    height={60}
                                    className="rounded-lg object-cover border border-border/50 aspect-square shadow-sm"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">{plant.strain}</p>
                                <p className="text-sm text-muted-foreground truncate">Lote: {plant.lotName || 'N/A'}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                                    {/* Use destructive badge for attention states */}
                                    <Badge variant={plant.status === 'Em tratamento' || plant.status === 'Diagnóstico Pendente' ? 'destructive' : 'secondary'} className="text-xs px-1.5 py-0.5 whitespace-nowrap"><Sprout className="inline mr-1 h-3 w-3"/>{plant.status}</Badge>
                                    <span className="flex items-center gap-1 whitespace-nowrap"><Warehouse className="h-3.5 w-3.5"/> Sala: {plant.growRoomId || 'N/A'}</span>
                                    <span className="flex items-center gap-1 whitespace-nowrap"><Sprout className="h-3.5 w-3.5"/>{`Plantada: ${plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A'}`}</span>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                        </Link>
                        </li>
                    ))}
                    </ul>

                     {/* Load More Button */}
                     {hasMore && user && !currentFirebaseError && (
                       <div className="text-center mt-6 py-4">
                           <Button
                               onClick={() => fetchPlants(true)}
                               disabled={isFetchingMore || generalDisabled}
                               variant="secondary"
                               className="button"
                           >
                             {isFetchingMore ? (
                               <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                               </>
                             ) : (
                               'Carregar Mais Plantas'
                             )}
                           </Button>
                       </div>
                     )}
                     {/* Indicate end of list */}
                      {!hasMore && displayedPlants.length > 0 && user && !currentFirebaseError && (
                        <p className="text-center text-muted-foreground text-sm mt-6 py-4 border-t">Fim da lista.</p>
                      )}
                </>
           ) : null }
        </CardContent>
      </Card>
    </div>
  );
}

