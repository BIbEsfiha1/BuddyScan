
// src/app/login/page.tsx
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
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link'; // Import Link

const loginSchema = z.object({
  email: z.string().email('Formato de email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Attempting login for:', data.email);
      await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('Login successful for:', data.email);
      toast({
        title: 'Login Realizado!',
        description: 'Você foi autenticado com sucesso.',
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard after successful login
    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMsg = 'Falha ao fazer login. Verifique seu email e senha.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMsg = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'O formato do email é inválido.';
      }
      setSubmitError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Erro no Login',
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
            <LogIn className="h-12 w-12 text-primary" />
           </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
            Acessar CannaLog
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Entre com seu email e senha.
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
                      <Input type="password" placeholder="********" {...field} disabled={isSubmitting} className="input" />
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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
           {/* Link to Signup */}
           <div className="mt-6 text-center text-sm">
             <p className="text-muted-foreground">
               Não tem uma conta?{' '}
               <Link href="/signup" className="font-medium text-primary hover:underline">
                 Cadastre-se
               </Link>
             </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
