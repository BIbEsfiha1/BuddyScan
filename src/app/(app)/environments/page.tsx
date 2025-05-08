// src/app/(app)/environments/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Warehouse, AlertCircle, Pencil, Trash2, Copy, Check } from '@/components/ui/lucide-icons';
import { EnvironmentForm } from '@/components/environments/environment-form';
import { addEnvironment, getEnvironmentsByOwner, updateEnvironment, deleteEnvironment } from '@/services/environment-service';
import type { Environment } from '@/types/environment';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function EnvironmentsPage() {
  const { user, loading: authLoading, authError } = useAuth();
  const { toast } = useToast();

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);

  // Determine if there's a critical initialization error
  const isDbUnavailable = authError; // Simplified check based on auth context error

  // --- Fetch Environments ---
  const fetchEnvironments = useCallback(async () => {
    if (!user || isDbUnavailable) {
      // Don't fetch if user isn't logged in or DB is unavailable
      setIsLoading(false);
       if (!user) setError("Faça login para gerenciar ambientes.");
       else setError(`Erro de Configuração: ${authError?.message || 'Serviço indisponível.'}`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEnvironments = await getEnvironmentsByOwner();
      setEnvironments(fetchedEnvironments);
    } catch (e: any) {
      console.error("Failed to fetch environments:", e);
      setError(`Falha ao carregar ambientes: ${e.message}`);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os ambientes." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, isDbUnavailable, authError]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading) { // Only fetch when auth state is resolved
        fetchEnvironments();
    }
  }, [fetchEnvironments, authLoading]);


  // --- Add Environment ---
  const handleAddSubmit = async (formData: any /* EnvironmentFormData from form */) => {
     setIsSubmitting(true);
     setSubmitError(null);
     try {
        // Prepare data: Split equipment string into array
        const dataToAdd = {
           ...formData,
           equipment: formData.equipmentString ? formData.equipmentString.split('\n').map((s: string) => s.trim()).filter(Boolean) : [],
           capacity: formData.capacity ?? null,
        };
        delete dataToAdd.equipmentString; // Remove the temporary string field

        const newEnvironment = await addEnvironment(dataToAdd);
        setEnvironments(prev => [newEnvironment, ...prev]); // Add to list optimistically (or refetch)
        setIsAddDialogOpen(false);
        toast({ title: "Sucesso!", description: `Ambiente "${newEnvironment.name}" criado.` });
     } catch (e: any) {
       console.error("Failed to add environment:", e);
       setSubmitError(`Falha ao criar ambiente: ${e.message}`);
       toast({ variant: "destructive", title: "Erro", description: `Não foi possível criar o ambiente. ${e.message}` });
     } finally {
       setIsSubmitting(false);
     }
  };


  // --- Edit Environment ---
  const handleEditSubmit = async (formData: any /* EnvironmentFormData from form */) => {
    if (!selectedEnvironment) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
       // Prepare data: Split equipment string into array
       const dataToUpdate = {
          name: formData.name,
          type: formData.type,
          capacity: formData.capacity ?? null,
          equipment: formData.equipmentString ? formData.equipmentString.split('\n').map((s: string) => s.trim()).filter(Boolean) : [],
       };

       await updateEnvironment(selectedEnvironment.id, dataToUpdate);
       // Update local state
       setEnvironments(prev => prev.map(env =>
         env.id === selectedEnvironment.id ? { ...env, ...dataToUpdate, id: env.id, ownerId: env.ownerId, createdAt: env.createdAt } : env // Preserve id, ownerId, createdAt
       ));
       setIsEditDialogOpen(false);
       setSelectedEnvironment(null);
       toast({ title: "Sucesso!", description: `Ambiente "${formData.name}" atualizado.` });
    } catch (e: any) {
      console.error("Failed to update environment:", e);
      setSubmitError(`Falha ao atualizar ambiente: ${e.message}`);
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível atualizar o ambiente. ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Environment ---
  const handleDeleteConfirm = async () => {
    if (!selectedEnvironment) return;
    setIsSubmitting(true); // Use submitting state for delete as well
    setError(null); // Clear general errors
    try {
      await deleteEnvironment(selectedEnvironment.id);
      setEnvironments(prev => prev.filter(env => env.id !== selectedEnvironment.id));
      setIsDeleteDialogOpen(false);
      setSelectedEnvironment(null);
      toast({ title: "Sucesso!", description: `Ambiente "${selectedEnvironment.name}" excluído.` });
    } catch (e: any) {
      console.error("Failed to delete environment:", e);
       // Show error in the delete confirmation dialog or as a toast
       toast({ variant: "destructive", title: "Erro ao Excluir", description: e.message || "Não foi possível excluir o ambiente." });
    } finally {
      setIsSubmitting(false);
    }
  };

   // --- Duplicate Environment ---
   const handleDuplicate = async (environmentToDuplicate: Environment) => {
       setIsSubmitting(true); // Use submitting state for duplication
       setSubmitError(null);
       setError(null);
       try {
           const { id, ownerId, createdAt, ...dataToDuplicate } = environmentToDuplicate; // Exclude fields to reset
           const duplicatedData = {
               ...dataToDuplicate,
               name: `${dataToDuplicate.name} (Cópia)`, // Add suffix to name
           };
           const newEnvironment = await addEnvironment(duplicatedData);
           setEnvironments(prev => [newEnvironment, ...prev]); // Add duplicated to list
           toast({ title: "Sucesso!", description: `Ambiente "${environmentToDuplicate.name}" duplicado como "${newEnvironment.name}".` });
       } catch (e: any) {
           console.error("Failed to duplicate environment:", e);
           toast({ variant: "destructive", title: "Erro ao Duplicar", description: `Não foi possível duplicar o ambiente. ${e.message}` });
           setError(`Falha ao duplicar ambiente: ${e.message}`); // Show error on main page
       } finally {
           setIsSubmitting(false);
       }
   };

  // --- Open Dialog Handlers ---
  const openEditDialog = (environment: Environment) => {
    setSelectedEnvironment(environment);
    setSubmitError(null); // Clear previous errors
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (environment: Environment) => {
    setSelectedEnvironment(environment);
    setIsDeleteDialogOpen(true);
  };

  // --- Render Logic ---
  const renderContent = () => {
      if (authLoading) {
          return (
              <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
              </div>
          );
      }
      if (isDbUnavailable) {
        return (
             <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                 <AlertDescription>{authError?.message || 'Serviço indisponível.'}. Não é possível gerenciar ambientes.</AlertDescription>
             </Alert>
        );
      }
       if (!user) { // Check if user is definitively not logged in (after authLoading is false)
         return (
             <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Login Necessário</AlertTitle>
                 <AlertDescription>Faça login para visualizar e gerenciar seus ambientes de cultivo.</AlertDescription>
                  <Button asChild variant="secondary" className="mt-4 button">
                      <Link href="/login">Ir para Login</Link>
                  </Button>
             </Alert>
         );
       }

      if (isLoading) {
         return (
             <div className="space-y-4">
                 <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-24 w-full" />
             </div>
         );
      }
      if (error) {
         return (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Ambientes</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button onClick={fetchEnvironments} variant="secondary" size="sm" className="mt-3 button">
                  Tentar Novamente
              </Button>
            </Alert>
         );
      }

      if (environments.length === 0) {
          return (
              <div className="text-center py-10 border border-dashed rounded-lg">
                  <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">Nenhum Ambiente Cadastrado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Crie seu primeiro ambiente de cultivo para começar a organizar suas plantas.
                  </p>
                  <DialogTrigger asChild>
                      <Button className="mt-6 button" onClick={() => { setSubmitError(null); setIsAddDialogOpen(true); }}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Criar Ambiente
                      </Button>
                  </DialogTrigger>
              </div>
          );
      }

      // Display list of environments
      return (
          <div className="space-y-4">
              {environments.map((env) => (
                  <Card key={env.id} className="card hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start p-4 gap-4">
                      <div className="flex-1 space-y-1">
                          <CardTitle className="text-xl flex items-center gap-2">
                              <Warehouse className="h-5 w-5 text-primary" /> {env.name}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                              <Badge variant="secondary">{env.type}</Badge>
                              {env.capacity && <span>Capacidade: {env.capacity} plantas</span>}
                               <span className="text-xs">Criado em: {new Date(env.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          {env.equipment && env.equipment.length > 0 && (
                              <p className="text-xs text-muted-foreground pt-1">Equipamentos: {env.equipment.join(', ')}</p>
                          )}
                           {/* Visual cue for incomplete setup (example: missing capacity) */}
                           {!env.capacity && (
                               <Badge variant="destructive" className="mt-1 text-xs">Configuração Incompleta (Capacidade)</Badge>
                           )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 self-start sm:self-center">
                         <Button variant="outline" size="icon" className="button h-8 w-8" onClick={() => handleDuplicate(env)} disabled={isSubmitting}>
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Duplicar</span>
                         </Button>
                         <Button variant="outline" size="icon" className="button h-8 w-8" onClick={() => openEditDialog(env)}>
                           <Pencil className="h-4 w-4" />
                           <span className="sr-only">Editar</span>
                         </Button>
                         <Button variant="destructive" size="icon" className="button h-8 w-8" onClick={() => openDeleteDialog(env)}>
                           <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                         </Button>
                      </div>
                  </Card>
              ))}
          </div>
      );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="card shadow-md">
        <CardHeader className="flex flex-row justify-between items-center">
           <div>
             <CardTitle className="text-2xl md:text-3xl flex items-center gap-2">
               <Warehouse className="h-6 w-6 text-primary"/>Gerenciar Ambientes
             </CardTitle>
             <CardDescription>Crie e organize seus espaços de cultivo.</CardDescription>
           </div>
           {/* Add Environment Button (only show if user is logged in and envs exist) */}
            {user && environments.length > 0 && (
                <DialogTrigger asChild>
                    <Button className="button" onClick={() => { setSubmitError(null); setIsAddDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Ambiente
                    </Button>
                </DialogTrigger>
             )}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* Add Environment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Ambiente</DialogTitle>
            <DialogDescription>
              Defina um novo espaço para seus cultivos.
            </DialogDescription>
          </DialogHeader>
          {/* Form submission is handled by form's onSubmit */}
          <form onSubmit={form.handleSubmit(handleAddSubmit)}>
            <EnvironmentForm
              onSubmitSuccess={() => {}} // Handled by form's onSubmit
              onCancel={() => setIsAddDialogOpen(false)}
              isSubmitting={isSubmitting}
              submitError={submitError}
             />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Environment Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="sm:max-w-[480px]">
           <DialogHeader>
             <DialogTitle>Editar Ambiente</DialogTitle>
             <DialogDescription>
               Atualize os detalhes do ambiente "{selectedEnvironment?.name}".
             </DialogDescription>
           </DialogHeader>
            {/* Pass initialData and handle submission */}
            <form onSubmit={form.handleSubmit(handleEditSubmit)}>
              <EnvironmentForm
                initialData={selectedEnvironment}
                onSubmitSuccess={() => {}} // Handled by form's onSubmit
                onCancel={() => setIsEditDialogOpen(false)}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            </form>
         </DialogContent>
       </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir o ambiente "{selectedEnvironment?.name}"? Esta ação não pode ser desfeita.
                         <br/>
                         <span className="font-semibold text-destructive">(Plantas neste ambiente não serão excluídas automaticamente.)</span>
                    </DialogDescription>
                </DialogHeader>
                 {/* TODO: Add check/warning if plants exist in this environment */}
                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button variant="outline" className="button">Cancelar</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteConfirm}
                        disabled={isSubmitting}
                        className="button"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                        Excluir Ambiente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
