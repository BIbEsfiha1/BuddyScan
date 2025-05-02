'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Warehouse, Loader2, ArrowLeft, Sprout } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addPlant } from '@/services/plant-id'; // Import the addPlant function
import Link from 'next/link'; // Import Link for back button

// Define the schema for plant registration
const registerPlantSchema = z.object({
  strain: z.string().min(1, 'O nome da variedade é obrigatório.').max(100, 'Nome da variedade muito longo.'),
  qrCode: z.string().min(3, 'O ID/QR Code deve ter pelo menos 3 caracteres.').max(50, 'ID/QR Code muito longo.'),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de nascimento inválida.', // Validate if it's a parsable date string
  }),
  growRoomId: z.string().min(1, 'O ID da sala de cultivo é obrigatório.').max(50, 'ID da sala muito longo.'),
  status: z.string().min(1, 'O status inicial é obrigatório (ex: Plântula, Vegetativo)').max(50, 'Status muito longo.'), // Added status field
});

type RegisterPlantFormData = z.infer<typeof registerPlantSchema>;

export default function RegisterPlantPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RegisterPlantFormData>({
    resolver: zodResolver(registerPlantSchema),
    defaultValues: {
      strain: '',
      qrCode: '',
      birthDate: '', // Default to empty string, will be handled by input type="date"
      growRoomId: '',
      status: 'Plântula', // Default initial status
    },
  });

  const onSubmit = async (data: RegisterPlantFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Construct the new plant object
      const newPlantData = {
        id: data.qrCode, // Use QR code as the main ID for simplicity in mock data
        qrCode: data.qrCode,
        strain: data.strain,
        birthDate: new Date(data.birthDate).toISOString(), // Convert to ISO string
        growRoomId: data.growRoomId,
        status: data.status,
      };

      console.log('Tentando cadastrar planta:', newPlantData);

      // Call the service function to add the plant
      await addPlant(newPlantData);

      console.log('Planta cadastrada com sucesso.');

      toast({
        title: 'Planta Cadastrada!',
        description: `A planta '${data.strain}' foi adicionada com sucesso.`,
        variant: 'default',
      });

      // Redirect to the dashboard after successful registration
      router.push('/');

    } catch (error: any) {
      console.error('Erro ao cadastrar planta:', error);
      const errorMsg = error.message || 'Falha ao cadastrar a planta. Verifique os dados ou tente novamente.';
      setSubmitError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-primary/10 text-foreground">
       <Card className="w-full max-w-lg shadow-xl border-primary/20 card"> {/* Added base class */}
         <CardHeader className="relative">
            <Button variant="ghost" size="icon" className="absolute top-3 left-3 button" asChild>
               <Link href="/" aria-label="Voltar ao Painel">
                  <ArrowLeft className="h-5 w-5" />
               </Link>
            </Button>
           <div className="flex flex-col items-center text-center pt-8"> {/* Added padding top */}
              <Sprout className="h-12 w-12 mb-3 text-primary animate-pulse" />
              <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
                Cadastrar Nova Planta
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Preencha os detalhes da sua nova planta.
              </CardDescription>
           </div>
         </CardHeader>
         <CardContent className="pt-6">
           <Form {...form}>
             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Strain Name */}
                <FormField
                  control={form.control}
                  name="strain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                         <Leaf className="h-4 w-4 text-secondary" /> Variedade (Strain)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Northern Lights, Purple Haze..." {...field} disabled={isSubmitting} className="input"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* QR Code / ID */}
                <FormField
                  control={form.control}
                  name="qrCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                         <QrCode className="h-4 w-4 text-secondary" /> ID / QR Code
                      </FormLabel>
                      <FormControl>
                         <Input placeholder="Identificador único para a planta" {...field} disabled={isSubmitting} className="input"/>
                      </FormControl>
                       <FormDescription>
                            Use um código curto e único. Você pode usar um leitor de QR para gerar um.
                       </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Birth Date */}
                 <FormField
                   control={form.control}
                   name="birthDate"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="flex items-center gap-2">
                         <Calendar className="h-4 w-4 text-secondary" /> Data de Nascimento / Plantio
                       </FormLabel>
                       <FormControl>
                         {/* Use input type="date" for native date picker */}
                         <Input type="date" {...field} disabled={isSubmitting} className="input appearance-none"/>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                {/* Grow Room ID */}
                 <FormField
                   control={form.control}
                   name="growRoomId"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="flex items-center gap-2">
                         <Warehouse className="h-4 w-4 text-secondary" /> ID da Sala de Cultivo
                       </FormLabel>
                       <FormControl>
                         <Input placeholder="Ex: Tenda Veg, Sala Flora 1" {...field} disabled={isSubmitting} className="input"/>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                  {/* Initial Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                           <Sprout className="h-4 w-4 text-secondary" /> Status Inicial
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Plântula, Vegetativo" {...field} disabled={isSubmitting} className="input"/>
                        </FormControl>
                        <FormDescription>O estágio inicial da planta.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                 {/* Submit Error Display */}
                 {submitError && (
                    <div className="text-sm font-medium text-destructive text-center bg-destructive/10 p-3 rounded-md">
                      {submitError}
                    </div>
                 )}

                {/* Submit Button */}
               <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting}>
                 {isSubmitting ? (
                   <>
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cadastrando...
                   </>
                 ) : (
                   'Cadastrar Planta'
                 )}
               </Button>
             </form>
           </Form>
         </CardContent>
       </Card>
    </div>
  );
}
