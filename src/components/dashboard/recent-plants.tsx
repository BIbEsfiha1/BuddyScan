
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
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
        {/* Optional: Link to full plant list */}
        {/* <Button variant="ghost" size="sm" asChild>
             <Link href="/plants">Ver Todas <ArrowRight className="ml-1 h-4 w-4" /></Link>
           </Button> */}
      </CardHeader>
      <CardDescription className="px-6 pb-4 text-muted-foreground">
          Plantas com cadastro mais recente.
      </CardDescription>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-0"> {/* Allow scrolling and space items */}
        {plants.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma planta cadastrada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => {
               // Using birthDate as a proxy for last updated date in this simplified version
               const lastUpdated = `Cadastrada em: ${new Date(plant.birthDate).toLocaleDateString('pt-BR')}`;

               return (
                 <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                   {/* Ensure Link points to the correct plant page using qrCode */}
                   <Link href={`/plant/${plant.qrCode}`} className="flex items-center space-x-4 px-2">
                     <div className="flex-shrink-0">
                       <Image
                         // Make hint more specific using plant status
                         data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                         // Generate placeholder seed based on status for relevance
                         src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}/100/100`}
                         alt={`Foto de ${plant.strain} (${plant.status})`}
                         width={50}
                         height={50}
                         className="rounded-md object-cover border border-border/50 aspect-square"
                       />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {/* Badge remains secondary for general status */}
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                          <span>·</span>
                          <span>{lastUpdated}</span>
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
       {/* Optional Footer Link - Ensure this link works if uncommented */}
       {plants.length > 0 && (
          <div className="p-4 border-t mt-auto text-center">
              <Button variant="link" size="sm" asChild>
                 {/* This link likely won't work without a dedicated page/filtering */}
                 <Link href="/plants">Ver todas as plantas</Link>
              </Button>
          </div>
       )}
    </Card>
  );
}
