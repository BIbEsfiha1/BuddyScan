'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Use the simplified PlantSummary for this component's props
interface PlantSummary {
  id: string;
  qrCode: string;
  strain: string;
  status: string; // e.g., 'Vegetativo', 'Floração', 'Colheita', 'Secagem'
  lastUpdated: string; // Could be a date string or relative time
  photoUrl?: string | null;
}

interface RecentPlantsProps {
  plants: PlantSummary[];
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
          Plantas com as atualizações mais recentes no diário ou cadastro.
      </CardDescription>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-0"> {/* Allow scrolling and space items */}
        {plants.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma planta recente encontrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => (
              <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                {/* Ensure Link points to the correct plant page using qrCode */}
                <Link href={`/plant/${plant.qrCode}`} className="flex items-center space-x-4 px-2">
                  <div className="flex-shrink-0">
                    <Image
                      // Make hint more specific using plant status
                      data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                      // Generate placeholder seed based on status for relevance
                      src={plant.photoUrl || `https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}/100/100`}
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
                       <span>Última att: {plant.lastUpdated}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
       {/* Optional Footer Link - Ensure this link works if uncommented */}
       {plants.length > 0 && (
          <div className="p-4 border-t mt-auto text-center">
              <Button variant="link" size="sm" asChild>
                 {/* Make sure '/plants' is a valid route if implemented */}
                 <Link href="/plants">Ver todas as plantas</Link>
              </Button>
          </div>
       )}
    </Card>
  );
}
