// src/app/(app)/register-plant/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { Leaf, CalendarDays, Warehouse, Loader2, ArrowLeft, Sprout, CheckCircle, Download, Layers, Home as HomeIcon, PackagePlus, QrCode as QrCodeIcon, Archive, AlertCircle as AlertCircleIcon } from '@/components/ui/lucide-icons';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addPlant, type Plant } from '@/services/plant-id'; // Import Firestore function
import Link from 'next/link';
import { generateUniqueId } from '@/lib/utils';
import { toDataURL } from 'qrcode'; // Import QR code generation function
import Image from 'next/image'; // Import Next Image component
import { db, auth } from '@/lib/firebase/client'; // Import client-side db and auth
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select
import { getEnvironmentsByOwner } from '@/services/environment-service'; // Import function to get environments
import type { Environment } from '@/types/environment'; // Import Environment type
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Update schema to use environmentId from Select
const registerPlantSchema = z.object({
  strain: z.string().min(1, 'O nome da variedade é obrigatório.').max(100, 'Nome da variedade muito longo.'),
  lotName: z.string().min(1, 'O nome do lote é obrigatório.').max(50, 'Nome do lote muito longo.'),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de nascimento inválida.',
  }),
  environmentId: z.string().min(1, 'Selecione um ambiente de cultivo.'), // Changed from growRoomId
  estimatedHarvestDate: z.string().optional().nullable(),
});

type RegisterPlantFormData = z.infer<typeof registerPlantSchema>;

export default function RegisterPlantPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading, authError } = useAuth(); // Get user and auth status

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);
  const [qrCodeImageDataUrl, setQrCodeImageDataUrl] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
  const [envFetchError, setEnvFetchError] = useState<string | null>(null);

  // Determine if there's a critical initialization error
  const isDbUnavailable = !db || !!authError; // db might be null if client.ts failed, or auth context has error

  const generalDisabled = isSubmitting || isDbUnavailable || authLoading || !user || isLoadingEnvironments;


  // --- Fetch Environments ---
  useEffect(() => {
    const fetchEnvs = async () => {
       if (!user) {
           setIsLoadingEnvironments(false);
           setEnvFetchError("Faça login para selecionar um ambiente.");
           return; // Don't fetch if not logged in
       }
       if (isDbUnavailable) {
           setIsLoadingEnvironments(false);
           setEnvFetchError("Serviço de banco de dados indisponível.");
           return;
       }

      setIsLoadingEnvironments(true);
      setEnvFetchError(null);
      try {
        const userEnvironments = await getEnvironmentsByOwner();
        setEnvironments(userEnvironments);
        if (userEnvironments.length === 0) {
          setEnvFetchError("Nenhum ambiente encontrado. Crie um ambiente primeiro.");
          toast({
            variant: "destructive",
            title: "Nenhum Ambiente Encontrado",
            description: (
              <span>
                Você precisa {" "}
                <Link href="/environments" className="underline font-semibold hover:text-destructive-foreground">
                  cadastrar um ambiente
                </Link>{" "}
                antes de registrar plantas.
              </span>
            ),
            duration: 10000,
          });
        }
      } catch (error: any) {
        console.error("Failed to fetch environments:", error);
        setEnvFetchError(`Erro ao carregar ambientes: ${error.message}`);
      } finally {
        setIsLoadingEnvironments(false);
      }
    };

    if (!authLoading) { // Fetch only when auth state is resolved
        fetchEnvs();
    }
  }, [user, authLoading, isDbUnavailable, toast]);

  const form = useForm<RegisterPlantFormData>({
    resolver: zodResolver(registerPlantSchema),
    defaultValues: {
      strain: '',
      lotName: '',
      birthDate: '',
      environmentId: '', // Initialize environmentId
      estimatedHarvestDate: '',
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

    // Check for DB availability first
    if (isDbUnavailable) {
        const errorMsg = authError?.message || 'Serviço de banco de dados indisponível.';
        console.error("Firestore DB not available:", errorMsg);
        setSubmitError(`Erro de Configuração: ${errorMsg} Não é possível salvar.`);
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'Não foi possível conectar ao banco de dados.',
        });
        setIsSubmitting(false);
        return;
    }
    // Check if user is logged in
    if (!user) {
        setSubmitError('Usuário não autenticado. Faça login para salvar.');
        toast({ variant: 'destructive', title: 'Não Autenticado', description: 'Faça login para registrar plantas.' });
        setIsSubmitting(false);
        return;
    }
    // Check if an environment was selected
     if (!data.environmentId) {
       setSubmitError('Selecione um ambiente de cultivo.');
       toast({ variant: 'destructive', title: 'Erro de Validação', description: 'É necessário selecionar um ambiente de cultivo.' });
       setIsSubmitting(false);
       return;
     }


    try {
      // Generate a unique ID for the plant, which will also be the QR code content
      const uniqueId = generateUniqueId(); // Use the existing utility

      // Construct the new plant object for Firestore
      // Rename environmentId to growRoomId to match Plant interface
      const newPlantData: Omit<Plant, 'status' | 'createdAt'> = {
        id: uniqueId,
        qrCode: uniqueId,
        strain: data.strain,
        lotName: data.lotName,
        estimatedHarvestDate: data.estimatedHarvestDate || null,
        birthDate: data.birthDate,
        growRoomId: data.environmentId, // Map environmentId to growRoomId
        ownerId: user.uid, // Associate plant with the logged-in user
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
      const savedPlant = await addPlant(newPlantData);

      console.log('Planta cadastrada com sucesso no Firestore:', savedPlant);
      setGeneratedQrCode(savedPlant.id); // Use the ID from the saved plant object

      toast({
        title: 'Planta Cadastrada!',
        description: (
           <div>
               <p>A planta '{savedPlant.strain}' (Lote: {savedPlant.lotName}) foi adicionada com sucesso.</p>
               <p className="font-semibold mt-2">QR Code / ID: {savedPlant.id}</p>
               <p className="text-sm text-muted-foreground">Status inicial: {savedPlant.status}</p>
           </div>
        ),
        variant: 'default',
        duration: 10000,
      });

      // Keep form data for potentially adding another plant quickly
       form.reset({
         strain: '', // Clear fields after successful submission
         lotName: '',
         birthDate: '',
         environmentId: '',
         estimatedHarvestDate: '',
       });


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
         <CardHeader className="relative pb-4"> {/* Reduced padding bottom */}
            {/* Ensure Button asChild wraps a single Link element */}
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 button" asChild>
               <Link href="/dashboard" aria-label="Voltar ao Painel">
                  <HomeIcon className="h-5 w-5" />
               </Link>
            </Button>
           <div className="flex flex-col items-center text-center pt-8">
               <div className="bg-primary/10 p-3 rounded-full mb-3 shadow-inner">
                 <PackagePlus className="h-8 w-8 text-primary" /> {/* Changed Icon */}
               </div>
               <CardTitle className="text-2xl font-bold">Cadastrar Nova Planta</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 max-w-xs">
                Preencha os detalhes. Um QR Code único será gerado ao salvar.
              </CardDescription>
           </div>
         </CardHeader>
         <CardContent className="pt-6">
             {/* Global Error/Auth Messages */}
              {isDbUnavailable && (
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircleIcon className="h-4 w-4" />
                     <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                     <AlertDescription>{authError?.message || 'Serviço de banco de dados indisponível.'} Não é possível salvar.</AlertDescription>
                 </Alert>
              )}
             {authLoading && !isDbUnavailable && (
                <Alert variant="default" className="mb-4 border-blue-500/50 bg-blue-500/10">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <AlertTitle>Autenticando...</AlertTitle>
                    <AlertDescription>Aguarde enquanto verificamos sua sessão.</AlertDescription>
                </Alert>
             )}
             {!authLoading && !user && !isDbUnavailable && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Não Autenticado</AlertTitle>
                    <AlertDescription>
                        Você precisa estar logado para cadastrar plantas. Por favor, <Link href="/login" className="font-semibold underline hover:text-destructive-foreground">faça login</Link>.
                    </AlertDescription>
                </Alert>
             )}

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
                         router.push('/dashboard') // Navigate to dashboard
                       }} className="mt-5 button">
                         <HomeIcon className="mr-2 h-4 w-4" /> Ir para o Painel
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
                            <Input placeholder="Ex: Northern Lights, Purple Haze..." {...field} disabled={generalDisabled} className="input"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                     {/* Lot Name */}
                    <FormField
                      control={form.control}
                      name="lotName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-secondary" /> Nome do Lote/Grupo
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Lote Verão 24, Grupo A" {...field} disabled={generalDisabled} className="input"/>
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
                            <CalendarDays className="h-4 w-4 text-secondary" /> Data de Nascimento / Plantio
                        </FormLabel>
                        <FormControl>
                            <Input type="date" {...field} disabled={generalDisabled} className="input appearance-none"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {/* Environment (Grow Room) Select */}
                    <FormField
                      control={form.control}
                      name="environmentId" // Use environmentId from schema
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-secondary" /> Ambiente de Cultivo
                          </FormLabel>
                          <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={generalDisabled || isLoadingEnvironments || environments.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="input">
                                <SelectValue placeholder={isLoadingEnvironments ? "Carregando ambientes..." : (envFetchError || "Selecione um ambiente")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingEnvironments ? (
                                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : envFetchError ? (
                                 <SelectItem value="error" disabled>{envFetchError}</SelectItem>
                              ) : environments.length === 0 ? (
                                 <SelectItem value="no-env" disabled>Nenhum ambiente cadastrado</SelectItem>
                              ) : (
                                environments.map((env) => (
                                  <SelectItem key={env.id} value={env.id}>
                                    {env.name} ({env.type})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                           {/* Link to create environment page if none exist */}
                           {environments.length === 0 && !isLoadingEnvironments && !envFetchError && (
                              <FormDescription className="text-xs">
                                  Nenhum ambiente encontrado.{" "}
                                  <Link href="/environments" className="underline text-primary hover:text-primary/80">
                                    Crie um ambiente aqui
                                  </Link>.
                              </FormDescription>
                            )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Estimated Harvest Date */}
                    <FormField
                      control={form.control}
                      name="estimatedHarvestDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-secondary" /> Data Estimada da Colheita (Opcional)
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} disabled={generalDisabled} className="input appearance-none"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* Submit Error Display */}
                    {submitError && !isDbUnavailable && ( // Only show if not critical error
                        <div className="text-sm font-medium text-destructive text-center bg-destructive/10 p-3 rounded-md">
                        {submitError}
                        </div>
                    )}

                    {/* Submit Button */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full font-semibold button"
                    disabled={generalDisabled || environments.length === 0 || !!envFetchError} // Also disable if no envs or fetch error
                 >
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cadastrando...
                    </>
                    ) : (
                      <>
                       <CheckCircle className="mr-2 h-5 w-5" /> Salvar Planta e Gerar QR Code
                      </>
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
