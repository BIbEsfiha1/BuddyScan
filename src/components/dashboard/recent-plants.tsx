
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight, Sprout, Clock } from '@/components/ui/lucide-icons'; // Use centralized icons, added Clock
import { Badge } from '@/components/ui/badge';
import type { Plant } from '@/services/plant-id'; // Import the base Plant type

// This component receives the full Plant object array now
interface RecentPlantsProps {
  plants: Plant[];
}

export default function RecentPlants({ plants }: RecentPlantsProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 card h-full flex flex-col"> {/* Flex column for structure */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Plantas Recentes</CardTitle>
        </div>
      </CardHeader>
      <CardDescription className="px-6 pb-4 text-muted-foreground text-sm"> {/* Slightly smaller text */}
          Plantas com cadastro mais recente.
      </CardDescription>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pt-0"> {/* Reduced spacing */}
        {plants.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma planta cadastrada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => {
               // Using createdAt or birthDate for display
                const lastUpdated = `Cadastrada em: ${plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR') : (plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A')}`;


               return (
                 <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                   {/* Ensure Link points to the correct plant page using plant.id */}
                   <Link href={`/plant/${plant.id}`} className="flex items-center space-x-3 px-2"> {/* Reduced spacing */}
                     <div className="flex-shrink-0">
                       <Image
                         // Make hint more specific using plant status
                         data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                         // Generate placeholder seed based on status for relevance
                         src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                         alt={`Foto de ${plant.strain} (${plant.status})`}
                         width={48} // Slightly smaller image
                         height={48}
                         className="rounded-md object-cover border border-border/50 aspect-square shadow-sm" // Added shadow
                       />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {/* Badge remains secondary for general status */}
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5"><Sprout className="inline mr-1 h-3 w-3"/>{plant.status}</Badge>
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3"/> {lastUpdated}</span>
                       </div>
                     </div>
                     <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                   </Link>
                 </li>
               );
            })}
          </ul>
        )}
      </CardContent>
       {/* Footer Link to the new /plants page */}
       {plants.length > 0 && (
          <div className="p-3 border-t mt-auto text-center"> {/* Reduced padding */}
              <Button variant="link" size="sm" asChild>
                 <Link href="/plants">Ver todas as plantas</Link>
              </Button>
          </div>
       )}
    </Card>
  );
}
