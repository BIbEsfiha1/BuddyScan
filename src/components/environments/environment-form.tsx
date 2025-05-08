// src/components/environments/environment-form.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Warehouse, Save, AlertCircle, Tags, Ruler, MonitorSmartphone, Home } from '@/components/ui/lucide-icons';
import { useToast } from '@/hooks/use-toast';
import type { Environment } from '@/types/environment';
import { ENVIRONMENT_TYPES } from '@/types/environment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema for environment form validation
const environmentSchema = z.object({
  name: z.string().min(1, 'O nome do ambiente é obrigatório.').max(100, 'Nome muito longo.'),
  type: z.enum(ENVIRONMENT_TYPES, { required_error: 'O tipo de ambiente é obrigatório.' }),
  capacity: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Capacidade deve ser um número' }).int("Capacidade deve ser um número inteiro").positive("Capacidade deve ser positiva").optional().nullable()
  ),
  // Equipment stored as a single string, split by newline in the service
  equipmentString: z.string().max(1000, "Lista de equipamentos muito longa.").optional(),
});

type EnvironmentFormData = z.infer<typeof environmentSchema>;

interface EnvironmentFormProps {
  initialData?: Environment | null; // Pass existing data for editing
  onSubmitSuccess: (environment: Environment) => void; // Callback on successful save
  onCancel?: () => void; // Optional cancel callback
  isLoading?: boolean; // Controlled loading state
  submitError?: string | null; // Controlled error state
  isSubmitting?: boolean; // Controlled submitting state
}

export function EnvironmentForm({
  initialData,
  onSubmitSuccess,
  onCancel,
  isLoading: parentIsLoading = false, // Default to false if not provided
  submitError: parentSubmitError = null,
  isSubmitting: parentIsSubmitting = false, // Default to false
}: EnvironmentFormProps) {
  const { toast } = useToast();
  // Combine parent state with potential internal state if needed, but prefer controlled
  const isLoading = parentIsLoading;
  const submitError = parentSubmitError;
  const isSubmitting = parentIsSubmitting;

  const form = useForm<EnvironmentFormData>({
    resolver: zodResolver(environmentSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || undefined,
      capacity: initialData?.capacity ?? undefined,
      equipmentString: initialData?.equipment?.join('\n') || '',
    },
  });

  // Reset form when initialData changes (e.g., switching between edit targets)
  useEffect(() => {
    form.reset({
      name: initialData?.name || '',
      type: initialData?.type || undefined,
      capacity: initialData?.capacity ?? undefined,
      equipmentString: initialData?.equipment?.join('\n') || '',
    });
  }, [initialData, form]);

  // Form submission is handled by the parent component via the onSubmit prop passed to the <form> tag where this component is used.
  // The actual data processing (calling addEnvironment/updateEnvironment) should happen in the parent page component.
  // This form component is only responsible for UI and validation.

  const isDisabled = isLoading || isSubmitting;

  return (
    <Form {...form}>
      {/* The form element itself should wrap this component in the parent */}
      <div className="space-y-6">
        {/* Display Submit Error */}
        {submitError && (
          <Alert variant="destructive" className="p-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao Salvar Ambiente</AlertTitle>
            <AlertDescription className="text-sm">{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Environment Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5"><Home className="h-4 w-4 text-secondary"/> Nome do Ambiente</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Tenda 1x1, Sala Flora Principal" {...field} disabled={isDisabled} className="input"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Environment Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5"><Tags className="h-4 w-4 text-secondary"/> Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isDisabled}>
                <FormControl>
                  <SelectTrigger className="input">
                    <SelectValue placeholder="Selecione o tipo de ambiente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ENVIRONMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacity */}
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary"/> Capacidade (nº de plantas)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Opcional"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={isDisabled} className="input"
                 />
              </FormControl>
               <FormDescription className="text-xs">Quantas plantas cabem confortavelmente.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipment */}
        <FormField
          control={form.control}
          name="equipmentString"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5"><MonitorSmartphone className="h-4 w-4 text-secondary"/> Equipamentos</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Opcional. Liste um equipamento por linha (Ex: Sensor DHT22, Exaustor 150mm)"
                  rows={4}
                  {...field}
                  disabled={isDisabled} className="textarea"
                 />
              </FormControl>
              <FormDescription className="text-xs">Sensores, luzes, exaustores, etc.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isDisabled} className="button">
              Cancelar
            </Button>
          )}
          <Button type="submit" className="flex-1 button" disabled={isDisabled}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar Ambiente
              </>
            )}
          </Button>
        </div>
      </div>
    </Form>
  );
}
