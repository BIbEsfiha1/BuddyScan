
// src/app/signup/page.tsx
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
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link'; // Import Link

// Schema includes password confirmation
const signupSchema = z.object({
  email: z.string().email('Formato de email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string().min(6, 'A confirmação de senha deve ter pelo menos 6 caracteres.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'], // Attach error to confirmPassword field
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Attempting signup for:', data.email);
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log('Signup successful for:', user.email, 'UID:', user.uid);

      // TODO: Optionally create a user document in Firestore here if needed
      // await addUserProfile(user.uid, { email: data.email, createdAt: serverTimestamp() });

      toast({
        title: 'Cadastro Realizado!',
        description: 'Sua conta foi criada com sucesso. Você já está logado.',
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard after successful signup
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      let errorMsg = 'Falha ao criar a conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este email já está em uso. Tente fazer login.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'O formato do email é inválido.';
      } else if (error.code === 'auth/weak-password') {
          errorMsg = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      }
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
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <UserPlus className="h-12 w-12 text-primary" />
           </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
            Criar Conta no CannaLog
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Insira seu email e senha para começar.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-secondary" /> Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={isSubmitting} className="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-secondary" /> Senha
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} disabled={isSubmitting} className="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
               <FormField
                 control={form.control}
                 name="confirmPassword"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel className="flex items-center gap-2">
                       <Lock className="h-4 w-4 text-secondary" /> Confirmar Senha
                     </FormLabel>
                     <FormControl>
                       <Input type="password" placeholder="Repita a senha" {...field} disabled={isSubmitting} className="input" />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

              {/* Submit Error Display */}
              {submitError && (
                <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Criando conta...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </form>
          </Form>
           {/* Link to Login */}
           <div className="mt-6 text-center text-sm">
             <p className="text-muted-foreground">
               Já tem uma conta?{' '}
               <Link href="/login" className="font-medium text-primary hover:underline">
                 Faça login
               </Link>
             </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
