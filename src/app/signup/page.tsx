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
// Import necessary Firebase auth functions
import {
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    TwitterAuthProvider,
    OAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator'; // Import Separator


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
  const [isSocialSubmitting, setIsSocialSubmitting] = useState<string | null>(null); // Track social signup
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // --- Email/Password Signup Handler ---
  const onEmailSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Attempting email signup for:', data.email);
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log('Email signup successful for:', user.email, 'UID:', user.uid);

      toast({
        title: 'Cadastro Realizado!',
        description: 'Sua conta foi criada com sucesso. Você já está logado.',
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error('Erro no cadastro com email:', error);
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

   // --- Social Signup/Login Handler (signInWithPopup handles both) ---
   const handleSocialSignup = async (providerName: 'google' | 'facebook' | 'twitter') => {
      setIsSocialSubmitting(providerName);
      setSubmitError(null);
      let provider;

      try {
         switch (providerName) {
             case 'google':
                 provider = new GoogleAuthProvider();
                 break;
             case 'facebook':
                 provider = new FacebookAuthProvider();
                 break;
             case 'twitter':
                 provider = new TwitterAuthProvider();
                 break;
             default:
                 throw new Error('Provedor social inválido');
         }

         console.log(`Attempting ${providerName} signup/login...`);
         // signInWithPopup will create a new user if they don't exist, or log in if they do
         await signInWithPopup(auth, provider);
         console.log(`${providerName} signup/login successful.`);

         toast({
            title: 'Autenticação Realizada!',
            description: `Você foi autenticado com sucesso usando ${providerName}.`,
            variant: 'default',
         });
         router.push('/'); // Redirect to dashboard

      } catch (error: any) {
          console.error(`Erro na autenticação com ${providerName}:`, error);
          let errorMsg = `Falha ao autenticar com ${providerName}.`;
         // Reuse error messages from login page for consistency
         if (error.code === 'auth/account-exists-with-different-credential') {
            errorMsg = `Já existe uma conta com este email, mas usando um método de login diferente. Tente fazer login com o método original.`;
         } else if (error.code === 'auth/popup-closed-by-user') {
             errorMsg = `Janela de autenticação com ${providerName} fechada antes da conclusão.`;
         } else if (error.code === 'auth/cancelled-popup-request') {
              errorMsg = `Mais de uma janela de autenticação foi aberta. Por favor, tente novamente.`;
         } else if (error.code === 'auth/popup-blocked') {
              errorMsg = `A janela de autenticação foi bloqueada pelo navegador. Habilite pop-ups para este site.`;
         } else if (error.code === 'auth/operation-not-allowed') {
             errorMsg = `Autenticação com ${providerName} não está habilitada nas configurações do Firebase.`;
         } else if (error.code === 'auth/unauthorized-domain') {
             errorMsg = `Este domínio não está autorizado para operações do Firebase.`;
         }

          setSubmitError(errorMsg);
          toast({
            variant: 'destructive',
            title: `Erro na Autenticação com ${providerName}`,
            description: errorMsg,
          });
      } finally {
           setIsSocialSubmitting(null);
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
            Insira seus dados ou use uma conta social.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            {/* Email/Password Form */}
            <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
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
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={isSubmitting || !!isSocialSubmitting} className="input" />
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
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} disabled={isSubmitting || !!isSocialSubmitting} className="input" />
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
                       <Input type="password" placeholder="Repita a senha" {...field} disabled={isSubmitting || !!isSocialSubmitting} className="input" />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {/* Submit Error Display - Common for all methods */}
              {submitError && (
                <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </div>
              )}


              {/* Email/Password Submit Button */}
              <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || !!isSocialSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Criando conta...
                  </>
                ) : (
                  'Cadastrar com Email'
                )}
              </Button>
            </form>
          </Form>

           {/* Separator */}
           <div className="my-6 flex items-center">
               <Separator className="flex-1" />
               <span className="mx-4 text-xs text-muted-foreground">OU</span>
               <Separator className="flex-1" />
           </div>

            {/* Social Signup/Login Buttons */}
             <div className="space-y-3">
                 {/* Google */}
                 <Button
                     variant="outline"
                     size="lg"
                     className="w-full font-medium button"
                     onClick={() => handleSocialSignup('google')}
                     disabled={isSubmitting || !!isSocialSubmitting}
                 >
                    {isSocialSubmitting === 'google' ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.3 109.8 8 244 8c66.8 0 125.3 24.5 170.4 64.1L361.5 128C321.5 91.8 284.3 71.4 244 71.4c-91.6 0-173.4 74.6-173.4 190.4 0 116.2 81.9 189.9 173.4 189.9 100.4 0 161.5-66.9 165.4-154.9H244V261.8h244z"></path></svg>
                    )}
                    Continuar com Google
                 </Button>
                  {/* Facebook */}
                  <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-medium button bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-[#1877F2]"
                      onClick={() => handleSocialSignup('facebook')}
                      disabled={isSubmitting || !!isSocialSubmitting}
                    >
                     {isSocialSubmitting === 'facebook' ? (
                         <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     ) : (
                        <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.8 90.7 226.4 209.3 245V327.7h-63V256h63v-54.6c0-62.2 37-96.5 93.7-96.5 27.1 0 55.5 4.8 55.5 4.8v61h-31.3c-30.8 0-40.4 19.1-40.4 38.7V256h68.8l-11 71.7h-57.8V501C413.3 482.4 504 379.8 504 256z"></path></svg>
                     )}
                     Continuar com Facebook
                  </Button>
                 {/* Twitter (X) */}
                 <Button
                     variant="outline"
                     size="lg"
                     className="w-full font-medium button bg-black text-white hover:bg-black/90 border-black"
                     onClick={() => handleSocialSignup('twitter')}
                     disabled={isSubmitting || !!isSocialSubmitting}
                 >
                    {isSocialSubmitting === 'twitter' ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    )}
                    Continuar com X (Twitter)
                 </Button>
             </div>


           {/* Link to Login */}
           <div className="mt-8 text-center text-sm">
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
