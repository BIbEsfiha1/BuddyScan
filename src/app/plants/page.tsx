'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPlants, CANNABIS_STAGES, Plant } from '@/services/plant-id';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, ListFilter, X, ArrowRight, Sprout, History, Search } from 'lucide-react'; // Added Search
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Filters {
  search: string;
  status: string;
  growRoom: string;
}

export default function AllPlantsPage() {
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', growRoom: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plants on mount
  useEffect(() => {
    const fetchPlants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Fetching all plants from service...");
        const fetchedPlants = await getAllPlants();
        console.log(`Fetched ${fetchedPlants.length} plants.`);
        setAllPlants(fetchedPlants);
        setDisplayedPlants(fetchedPlants); // Initially display all
      } catch (e) {
        console.error('Failed to fetch all plant data:', e);
        setError('Falha ao carregar a lista de plantas.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlants();
  }, []);

  // Filter plants when filters or allPlants change
  useEffect(() => {
    console.log("Applying filters:", filters);
    let filtered = [...allPlants];

    // Apply search filter (strain name)
    if (filters.search) {
      filtered = filtered.filter(plant =>
        plant.strain.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(plant => plant.status === filters.status);
    }

    // Apply grow room filter
    if (filters.growRoom) {
      filtered = filtered.filter(plant => plant.growRoomId === filters.growRoom);
    }

    console.log(`Filtered down to ${filtered.length} plants.`);
    setDisplayedPlants(filtered);
  }, [filters, allPlants]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', growRoom: '' });
  };

  // Get unique grow rooms for the filter dropdown
  const uniqueGrowRooms = useMemo(() => {
    const rooms = new Set(allPlants.map(plant => plant.growRoomId));
    return Array.from(rooms).sort();
  }, [allPlants]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-3">
                  <History className="h-7 w-7 text-primary" />
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Todas as Plantas</CardTitle>
                    <CardDescription>Visualize e filtre seu inventário de plantas.</CardDescription>
                  </div>
             </div>
             <Button variant="outline" onClick={() => window.history.back()} className="button self-start sm:self-center">
                Voltar
             </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Card */}
      <Card className="shadow-md card">
        <CardHeader>
            <div className="flex items-center gap-2">
                <ListFilter className="h-5 w-5 text-secondary"/>
                <CardTitle className="text-xl">Filtros</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-1">
             <label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Search className="h-4 w-4"/> Pesquisar Variedade</label>
            <Input
              id="search-filter"
              placeholder="Nome da variedade..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1">
             <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Sprout className="h-4 w-4"/> Filtrar por Status</label>
            <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger id="status-filter" className="input">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os Status</SelectItem>
                {CANNABIS_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grow Room Select */}
          <div className="space-y-1">
              <label htmlFor="room-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Sprout className="h-4 w-4"/> Filtrar por Sala</label>
             <Select
                value={filters.growRoom}
                onValueChange={(value) => handleFilterChange('growRoom', value)}
                disabled={uniqueGrowRooms.length === 0}
             >
               <SelectTrigger id="room-filter" className="input">
                 <SelectValue placeholder="Todas as Salas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="">Todas as Salas</SelectItem>
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
                disabled={!filters.search && !filters.status && !filters.growRoom}
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
            <p className="text-center text-muted-foreground py-10">Nenhuma planta encontrada com os filtros aplicados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {displayedPlants.map((plant) => (
                <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                  <Link href={`/plant/${plant.qrCode}`} className="flex items-center space-x-4 px-2">
                    <div className="flex-shrink-0">
                      <Image
                        data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                        src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                        alt={`Foto de ${plant.strain}`}
                        width={50}
                        height={50}
                        className="rounded-md object-cover border border-border/50 aspect-square"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                         <span>·</span>
                         <span>Sala: {plant.growRoomId}</span>
                         <span>·</span>
                         <span>{`Plantada: ${new Date(plant.birthDate).toLocaleDateString('pt-BR')}`}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
