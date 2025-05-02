
'use client';

import React, { useState, useCallback } from 'react';
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
import { Leaf, Calendar, Warehouse, Loader2, ArrowLeft, Sprout, CheckCircle, Download } from '@/components/ui/lucide-icons'; // Use centralized icons
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addPlant, type Plant } from '@/services/plant-id'; // Import Firestore function
import Link from 'next/link';
import { generateUniqueId } from '@/lib/utils';
import { QrCode as QrCodeIcon } from 'lucide-react'; // Specific import if needed
import { toDataURL } from 'qrcode'; // Import QR code generation function
import Image from 'next/image'; // Import Next Image component
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase error state


// Define the schema for plant registration
const registerPlantSchema = z.object({
  strain: z.string().min(1, 'O nome da variedade é obrigatório.').max(100, 'Nome da variedade muito longo.'),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de nascimento inválida.',
  }),
  growRoomId: z.string().min(1, 'O ID da sala de cultivo é obrigatório.').max(50, 'ID da sala muito longo.'),
  status: z.string().min(1, 'O status inicial é obrigatório (ex: Plântula, Vegetativo)').max(50, 'Status muito longo.'),
});

type RegisterPlantFormData = z.infer<typeof registerPlantSchema>;

export default function RegisterPlantPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);
  const [qrCodeImageDataUrl, setQrCodeImageDataUrl] = useState<string | null>(null);


  const form = useForm<RegisterPlantFormData>({
    resolver: zodResolver(registerPlantSchema),
    defaultValues: {
      strain: '',
      birthDate: '',
      growRoomId: '',
      status: 'Plântula',
    },
  });

  // Callback function to download the QR code
  const downloadQrCode = useCallback(() => {
    if (!qrCodeImageDataUrl || !generatedQrCode) return;

    const link = document.createElement('a');
    link.href = qrCodeImageDataUrl;
    link.download = `qrcode-planta-${generatedQrCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
     toast({
        title: 'Download Iniciado',
        description: `Baixando QR code para ${generatedQrCode}.png`,
     });
  }, [qrCodeImageDataUrl, generatedQrCode, toast]);

  const onSubmit = async (data: RegisterPlantFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setGeneratedQrCode(null);
    setQrCodeImageDataUrl(null);

    // Check for Firebase initialization errors before proceeding
    if (firebaseInitializationError) {
        console.error("Firebase initialization error:", firebaseInitializationError);
        setSubmitError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível salvar.`);
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'Não foi possível conectar ao banco de dados. Verifique as configurações do Firebase.',
        });
        setIsSubmitting(false);
        return;
    }


    try {
      // Generate a unique ID for the plant, which will also be the QR code content
      const uniqueId = generateUniqueId(); // Use the existing utility

      // Construct the new plant object for Firestore
      const newPlantData: Plant = {
        id: uniqueId, // Use generated ID as Firestore document ID
        qrCode: uniqueId, // QR Code content is the same as the ID
        strain: data.strain,
        birthDate: new Date(data.birthDate).toISOString(), // Store as ISO string
        growRoomId: data.growRoomId,
        status: data.status,
        createdAt: new Date().toISOString(), // Add creation timestamp
      };

      console.log('Tentando cadastrar planta no Firestore:', newPlantData);

      // Generate QR Code Image Data URL
      let qrImageDataUrl = null;
      try {
        qrImageDataUrl = await toDataURL(uniqueId, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            scale: 8,
            color: { dark: '#000000', light: '#FFFFFF' },
        });
         setQrCodeImageDataUrl(qrImageDataUrl);
      } catch (qrError) {
         console.error("Erro ao gerar a imagem do QR Code:", qrError);
         throw new Error("Falha ao gerar a imagem do QR Code.");
      }


      // Call the service function to add the plant to Firestore
      await addPlant(newPlantData);

      console.log('Planta cadastrada com sucesso no Firestore com ID:', uniqueId);
      setGeneratedQrCode(uniqueId);


      toast({
        title: 'Planta Cadastrada!',
        description: (
           <div>
               <p>A planta '{data.strain}' foi adicionada com sucesso.</p>
               <p className="font-semibold mt-2">QR Code / ID: {uniqueId}</p>
           </div>
        ),
        variant: 'default',
        duration: 10000,
      });

      // Keep form data for potentially adding another plant quickly
      // form.reset();


    } catch (error: any) {
      console.error('Erro ao cadastrar planta no Firestore:', error);
      const errorMsg = error.message || 'Falha ao cadastrar a planta. Verifique os dados ou tente novamente.';
      setSubmitError(errorMsg);
      setQrCodeImageDataUrl(null); // Clear image on error
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
       <Card className="w-full max-w-lg shadow-xl border-primary/20 card">
         <CardHeader className="relative">
            <Button variant="ghost" size="icon" className="absolute top-3 left-3 button" asChild>
               <Link href="/" aria-label="Voltar ao Painel">
                  <ArrowLeft className="h-5 w-5" />
               </Link>
            </Button>
           <div className="flex flex-col items-center text-center pt-8">
               <Image
                   src="/budscan-logo.png"
                   alt="BudScan Logo"
                   width={180}
                   height={51}
                   priority
                   className="mb-3"
               />
              <CardDescription className="text-muted-foreground mt-1">
                Preencha os detalhes da nova planta. O QR Code será gerado automaticamente.
              </CardDescription>
           </div>
         </CardHeader>
         <CardContent className="pt-6">
           {/* Display generated QR code if available */}
           {generatedQrCode && qrCodeImageDataUrl && !isSubmitting && (
             <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30 p-4 text-center card">
                <CardHeader className="p-0 pb-2">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <CardTitle className="text-lg text-green-700 dark:text-green-300">Planta Cadastrada!</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                   <p className="text-sm text-muted-foreground mb-2">O QR Code / ID único para esta planta é:</p>
                   <div className="flex items-center justify-center gap-2 bg-muted p-2 rounded-md">
                       <QrCodeIcon className="h-5 w-5 text-primary" />
                       <p className="text-lg font-mono font-semibold text-primary break-all">{generatedQrCode}</p>
                   </div>
                    {/* Display QR Code Image */}
                    <div className="mt-3 flex flex-col items-center">
                       <Image
                           src={qrCodeImageDataUrl}
                           alt={`QR Code para ${generatedQrCode}`}
                           width={180}
                           height={180}
                           className="border-2 border-muted p-1 rounded-md shadow-md bg-white"
                           priority
                       />
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadQrCode}
                            className="mt-4 button"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar QR Code
                        </Button>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => {
                         router.push('/')
                       }} className="mt-5 button">
                         Ir para o Painel
                     </Button>
                      <Button variant="link" size="sm" onClick={() => {
                          setGeneratedQrCode(null);
                          setQrCodeImageDataUrl(null);
                          setSubmitError(null);
                          form.reset();
                          toast({ title: "Formulário limpo", description: "Pronto para cadastrar outra planta."});
                      }} className="mt-1 button">
                         Cadastrar Outra Planta
                     </Button>
                </CardContent>
             </Card>
           )}

           {/* Hide form if successfully submitted and QR code is shown */}
           {(!generatedQrCode || isSubmitting) && (
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
                            <Input placeholder="Ex: Northern Lights, Purple Haze..." {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
                        </FormControl>
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
                            <Input type="date" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input appearance-none"/>
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
                            <Input placeholder="Ex: Tenda Veg, Sala Flora 1" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
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
                            <Input placeholder="Ex: Plântula, Vegetativo" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
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
                     {firebaseInitializationError && !submitError && (
                         <div className="text-sm font-medium text-destructive text-center bg-destructive/10 p-3 rounded-md">
                             Erro de Configuração: {firebaseInitializationError.message}. Não é possível salvar.
                         </div>
                     )}

                    {/* Submit Button */}
                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || !!firebaseInitializationError}>
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cadastrando...
                    </>
                    ) : (
                    'Cadastrar Planta e Gerar QR Code'
                    )}
                </Button>
                </form>
            </Form>
           )}
         </CardContent>
       </Card>
    </div>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/