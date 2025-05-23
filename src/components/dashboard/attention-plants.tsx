
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Clock } from '@/components/ui/lucide-icons'; // Use centralized icons, added Clock
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Plant } from '@/services/plant-id'; // Import the base Plant type

// This component receives the full Plant object now
interface AttentionPlantsProps {
  plants: Plant[];
}

export default function AttentionPlants({ plants }: AttentionPlantsProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 card border-destructive/30"> {/* Destructive border hint */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-xl">Requer Atenção</CardTitle>
        </div>
      </CardHeader>
      <CardDescription className="px-6 pb-4 text-muted-foreground text-sm"> {/* Slightly smaller description */}
          Plantas que podem precisar de intervenção ou cuidados especiais.
      </CardDescription>
      <CardContent className="space-y-3 pt-0"> {/* Reduced spacing */}
        {plants.length === 0 ? (
           <Alert variant="default" className="border-primary/20 bg-primary/5"> {/* Use default, maybe slightly styled */}
             <AlertTriangle className="h-4 w-4 text-primary" /> {/* Use primary color for positive sign */}
             <AlertTitle>Tudo Certo!</AlertTitle>
             <AlertDescription>
               Nenhuma planta parece precisar de atenção especial no momento.
             </AlertDescription>
           </Alert>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => {
              // Derive attention reason and last updated from plant data here
              const attentionReason = `Status: ${plant.status}`; // Simple reason
              // Using birthDate as a proxy for last updated date in this simplified version
               const lastUpdated = `Cadastrada em: ${plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR') : (plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A')}`;


              return (
                <li key={plant.id} className="py-3 group hover:bg-destructive/5 rounded-md transition-colors duration-150">
                  {/* Ensure Link points to the correct plant page using plant.id */}
                  <Link href={`/plant/${plant.id}`} className="flex items-center space-x-3 px-2"> {/* Reduced spacing */}
                     <div className="flex-shrink-0">
                      <Image
                        // Updated hint to be more specific for AI search
                        data-ai-hint={`cannabis plant ${plant.status.toLowerCase().replace(/ /g, '-')}`}
                        // Updated placeholder seed
                        src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-problem-${plant.id}/100/100`}
                        alt={`Foto de ${plant.strain} precisando de atenção (${attentionReason})`}
                        width={48} // Slightly smaller image
                        height={48}
                        className="rounded-md object-cover border border-destructive/50 aspect-square shadow-sm" // Added shadow
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                       <p className="text-sm text-destructive font-medium truncate">{attentionReason}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                         {/* Use destructive badge for attention status */}
                         <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                         <span className="flex items-center gap-0.5"><Clock className="h-3 w-3"/> {lastUpdated}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {/* Footer Link to the new /plants page with a filter hint */}
       {plants.length > 0 && (
           <div className="p-3 border-t mt-auto text-center"> {/* Reduced padding */}
              <Button variant="link" size="sm" asChild className="text-destructive hover:text-destructive/80">
                 {/* Link to the main plants page; filtering logic is client-side in /plants page */}
                 <Link href="/plants">Ver todas as plantas com atenção</Link>
              </Button>
           </div>
        )}
    </Card>
  );
}
