'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface AttentionPlantSummary {
  id: string;
  qrCode: string;
  strain: string;
  status: string;
  attentionReason: string; // Reason for needing attention
  lastUpdated: string;
  photoUrl?: string | null;
}

interface AttentionPlantsProps {
  plants: AttentionPlantSummary[];
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
      <CardDescription className="px-6 pb-4 text-muted-foreground">
          Plantas que podem precisar de intervenção ou cuidados especiais.
      </CardDescription>
      <CardContent className="space-y-4 pt-0">
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
            {plants.map((plant) => (
              <li key={plant.id} className="py-3 group hover:bg-destructive/5 rounded-md transition-colors duration-150">
                {/* Ensure Link points to the correct plant page using qrCode */}
                <Link href={`/plant/${plant.qrCode}`} className="flex items-center space-x-4 px-2">
                   <div className="flex-shrink-0">
                    <Image
                      // Updated hint to be more specific for AI search
                      data-ai-hint={`cannabis plant ${plant.attentionReason.toLowerCase().replace(/ /g, '-')}`}
                      // Updated placeholder seed
                      src={plant.photoUrl || `https://picsum.photos/seed/cannabis-${plant.attentionReason.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/100/100`}
                      alt={`Foto de ${plant.strain} precisando de atenção (${plant.attentionReason})`}
                      width={50}
                      height={50}
                      className="rounded-md object-cover border border-destructive/50 aspect-square" // Destructive hint on border
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                     <p className="text-sm text-destructive font-medium truncate">{plant.attentionReason}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                       {/* Use destructive badge for attention status */}
                       <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                       <span>·</span>
                       <span>Última att: {plant.lastUpdated}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {/* Optional Footer Link - Keep as is unless a specific page exists */}
       {plants.length > 0 && (
           <div className="p-4 border-t mt-auto text-center">
              <Button variant="link" size="sm" asChild className="text-destructive hover:text-destructive/80">
                 {/* Make sure this link points to a valid page if implemented */}
                 <Link href="/plants?filter=attention">Ver todas as plantas com atenção</Link>
              </Button>
           </div>
        )}
    </Card>
  );
}
