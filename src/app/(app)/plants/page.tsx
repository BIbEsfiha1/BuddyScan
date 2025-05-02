
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPlants, CANNABIS_STAGES, Plant } from '@/services/plant-id'; // Import Firestore functions
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Filter, X, ArrowRight, Sprout, Warehouse, Search, Package, ArrowLeft } from '@/components/ui/lucide-icons'; // Use centralized icons
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast'; // Import useToast

const ALL_STATUSES_VALUE = "all_statuses";
const ALL_ROOMS_VALUE = "all_rooms";

interface Filters {
  search: string;
  status: string; // Will store the actual status or empty string if 'all' is selected
  growRoom: string; // Will store the actual room or empty string if 'all' is selected
}

export default function AllPlantsPage() {
  const { toast } = useToast();
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
  // Store the raw filter selection, including "all" values
  const [selectedFilters, setSelectedFilters] = useState<{ search: string; status: string; growRoom: string }>({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plants from Firestore on mount
  useEffect(() => {
    const fetchPlants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Fetching all plants from Firestore service...");
        const fetchedPlants = await getAllPlants(); // Use Firestore function
        console.log(`Fetched ${fetchedPlants.length} plants.`);
        setAllPlants(fetchedPlants);
      } catch (e) {
        console.error('Failed to fetch all plant data from Firestore:', e);
        setError(`Falha ao carregar a lista de plantas: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
         toast({
           variant: 'destructive',
           title: 'Erro ao Carregar Plantas',
           description: `Não foi possível buscar os dados das plantas. ${e instanceof Error ? e.message : ''}`,
         });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlants();
  }, [toast]); // Add toast to dependency array

  // Filter plants when selectedFilters or allPlants change
  useEffect(() => {
    console.log("Applying filters based on selections:", selectedFilters);
    let filtered = [...allPlants];

    // Apply search filter (strain name)
    if (selectedFilters.search) {
      filtered = filtered.filter(plant =>
        plant.strain.toLowerCase().includes(selectedFilters.search.toLowerCase())
      );
    }

    // Apply status filter (only if not 'all')
    if (selectedFilters.status && selectedFilters.status !== ALL_STATUSES_VALUE) {
      filtered = filtered.filter(plant => plant.status === selectedFilters.status);
    }

    // Apply grow room filter (only if not 'all')
    if (selectedFilters.growRoom && selectedFilters.growRoom !== ALL_ROOMS_VALUE) {
      filtered = filtered.filter(plant => plant.growRoomId === selectedFilters.growRoom);
    }

    console.log(`Filtered down to ${filtered.length} plants.`);
    setDisplayedPlants(filtered);
  }, [selectedFilters, allPlants]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
     setSelectedFilters(prevFilters => ({
        ...prevFilters,
        [filterName]: value,
     }));
  };

  const clearFilters = () => {
    setSelectedFilters({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  };

  // Get unique grow rooms for the filter dropdown
  const uniqueGrowRooms = useMemo(() => {
    const rooms = new Set(allPlants.map(plant => plant.growRoomId).filter(Boolean)); // Filter out potential null/empty values
    return Array.from(rooms).sort();
  }, [allPlants]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-lg border-primary/10 card bg-gradient-to-r from-card to-muted/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-3">
                  <Package className="h-7 w-7 text-primary" /> {/* Updated Icon */}
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Inventário de Plantas</CardTitle>
                    <CardDescription>Visualize e filtre todas as suas plantas cadastradas.</CardDescription>
                  </div>
             </div>
             <Button variant="outline" onClick={() => window.history.back()} className="button self-start sm:self-center">
                <ArrowLeft className="mr-2 h-4 w-4"/> {/* Added Icon */}
                Voltar
             </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Card */}
      <Card className="shadow-md card">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-secondary"/> {/* Updated Icon */}
                <CardTitle className="text-xl">Filtros</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-1.5"> {/* Increased spacing */}
             <label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Search className="h-4 w-4"/> Pesquisar Variedade</label>
            <Input
              id="search-filter"
              placeholder="Nome da variedade..."
              value={selectedFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1.5"> {/* Increased spacing */}
             <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Sprout className="h-4 w-4"/> Filtrar por Status</label>
            <Select
                value={selectedFilters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger id="status-filter" className="input">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES_VALUE}>Todos os Status</SelectItem>
                {CANNABIS_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grow Room Select */}
          <div className="space-y-1.5"> {/* Increased spacing */}
              <label htmlFor="room-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Warehouse className="h-4 w-4"/> Filtrar por Sala</label> {/* Updated Icon */}
             <Select
                value={selectedFilters.growRoom}
                onValueChange={(value) => handleFilterChange('growRoom', value)}
                disabled={uniqueGrowRooms.length === 0}
             >
               <SelectTrigger id="room-filter" className="input">
                 <SelectValue placeholder="Todas as Salas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_ROOMS_VALUE}>Todas as Salas</SelectItem>
                 {uniqueGrowRooms.map((room) => (
                   <SelectItem key={room} value={room}>{room}</SelectItem>
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
                    !selectedFilters.search &&
                    selectedFilters.status === ALL_STATUSES_VALUE &&
                    selectedFilters.growRoom === ALL_ROOMS_VALUE
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
          <CardTitle>Resultados ({displayedPlants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-10">{error}</p>
          ) : displayedPlants.length === 0 ? (
             allPlants.length > 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma planta encontrada com os filtros aplicados.</p>
             ) : (
                 <p className="text-center text-muted-foreground py-10">Nenhuma planta cadastrada ainda.</p>
             )
          ) : (
            <ul className="divide-y divide-border -mx-6"> {/* Negative margin to extend divider */}
              {displayedPlants.map((plant) => (
                <li key={plant.id} className="py-4 group hover:bg-muted/30 rounded-md transition-colors duration-150 px-6"> {/* Added padding */}
                   {/* Link uses plant.id now */}
                  <Link href={`/plant/${plant.id}`} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Image
                        data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                        src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                        alt={`Foto de ${plant.strain}`}
                        width={60} // Slightly larger image
                        height={60}
                        className="rounded-lg object-cover border border-border/50 aspect-square shadow-sm" // Rounded-lg
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">{plant.strain}</p> {/* Larger font */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1"> {/* Flex wrap for small screens */}
                         <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap"><Sprout className="inline mr-1 h-3 w-3"/>{plant.status}</Badge>
                         <span className="flex items-center gap-1 whitespace-nowrap"><Warehouse className="h-3.5 w-3.5"/> Sala: {plant.growRoomId || 'N/A'}</span>
                         {/* Format date from ISO string */}
                         <span className="flex items-center gap-1 whitespace-nowrap"><Sprout className="h-3.5 w-3.5"/>{`Plantada: ${plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A'}`}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" /> {/* Move arrow to far right */}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
