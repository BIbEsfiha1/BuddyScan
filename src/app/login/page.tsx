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
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'; // Use appropriate icons if available, otherwise text
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
// Import necessary Firebase auth functions
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    TwitterAuthProvider, // Note: TwitterAuthProvider might have limitations or require elevated API access.
    OAuthProvider // Generic provider for others if needed
} from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import auth and potential init error
import Link from 'next/link';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert for init error


const loginSchema = z.object({
  email: z.string().email('Formato de email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState<string | null>(null); // Track which social login is in progress
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // --- Email/Password Login Handler ---
  const onEmailSubmit = async (data: LoginFormData) => {
     if (!auth) {
        setSubmitError("Autenticação não está disponível.");
        toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de autenticação indisponível.' });
        return;
     }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Attempting email login for:', data.email);
      await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('Email login successful for:', data.email);
      toast({
        title: 'Login Realizado!',
        description: 'Você foi autenticado com sucesso.',
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error('Erro no login com email:', error);
      let errorMsg = 'Falha ao fazer login. Verifique seu email e senha.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMsg = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'O formato do email é inválido.';
      } else if (error.code === 'auth/network-request-failed') {
          errorMsg = 'Erro de rede. Verifique sua conexão com a internet.';
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

  // --- Social Login Handler ---
  const handleSocialLogin = async (providerName: 'google' | 'facebook' | 'twitter') => {
     if (!auth) {
         setSubmitError("Autenticação não está disponível.");
         toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de autenticação indisponível.' });
         return;
     }
     console.log(`Initiating social login with ${providerName}...`);
     setIsSocialSubmitting(providerName);
     setSubmitError(null);
     let provider;

     try {
        switch (providerName) {
            case 'google':
                console.log("Creating GoogleAuthProvider instance.");
                provider = new GoogleAuthProvider();
                // Optional: Add custom parameters if needed
                // provider.addScope('profile');
                // provider.addScope('email');
                // provider.setCustomParameters({
                //   'login_hint': 'user@example.com' // Example
                // });
                break;
            case 'facebook':
                 console.log("Creating FacebookAuthProvider instance.");
                provider = new FacebookAuthProvider();
                break;
            case 'twitter':
                 console.log("Creating TwitterAuthProvider instance.");
                provider = new TwitterAuthProvider();
                break;
            default:
                console.error(`Invalid social provider name: ${providerName}`);
                throw new Error('Provedor social inválido');
        }

        console.log(`Attempting signInWithPopup for ${providerName}...`);
        // Use signInWithPopup for social logins
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`${providerName} login successful. User:`, user.email, user.uid);


        toast({
           title: 'Login Realizado!',
           description: `Você foi autenticado com sucesso usando ${providerName}.`,
           variant: 'default',
        });
        router.push('/'); // Redirect to dashboard

     } catch (error: any) {
         console.error(`Erro no login com ${providerName}:`, error);
         let errorMsg = `Falha ao fazer login com ${providerName}.`;
         if (error.code === 'auth/account-exists-with-different-credential') {
            errorMsg = `Já existe uma conta com este email (${error.customData?.email}). Tente fazer login com o provedor original.`;
         } else if (error.code === 'auth/popup-closed-by-user') {
             errorMsg = `Janela de login com ${providerName} fechada antes da conclusão.`;
         } else if (error.code === 'auth/cancelled-popup-request') {
              errorMsg = `Mais de uma janela de login foi aberta. Por favor, tente novamente.`;
         } else if (error.code === 'auth/popup-blocked') {
              errorMsg = `A janela de login foi bloqueada pelo navegador. Habilite pop-ups para este site.`;
         } else if (error.code === 'auth/operation-not-allowed') {
             errorMsg = `Login com ${providerName} não está habilitado nas configurações do Firebase.`;
         } else if (error.code === 'auth/unauthorized-domain') {
             errorMsg = `Este domínio não está autorizado para operações do Firebase. Verifique as configurações no Console do Firebase.`;
         } else if (error.code === 'auth/network-request-failed') {
             errorMsg = 'Erro de rede. Verifique sua conexão com a internet.';
         }


         setSubmitError(errorMsg); // Show error relevant to social login
         toast({
           variant: 'destructive',
           title: `Erro no Login com ${providerName}`,
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
            <LogIn className="h-12 w-12 text-primary" />
           </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
            Acessar CannaLog
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Entre com seu email e senha ou use uma conta social.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">

           {/* Display Firebase Initialization Error if present */}
            {firebaseInitializationError && (
               <Alert variant="destructive" className="mb-6">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Erro de Configuração</AlertTitle>
                 <AlertDescription>
                   {firebaseInitializationError.message}. A autenticação pode não funcionar.
                 </AlertDescription>
               </Alert>
            )}

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
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError} className="input" />
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
                      <Input type="password" placeholder="********" {...field} disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError} className="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Error Display - Now common for both methods */}
              {submitError && (
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                  </div>
              )}


              {/* Email/Password Submit Button */}
              <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...
                  </>
                ) : (
                  'Entrar com Email'
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

             {/* Social Login Buttons */}
             <div className="space-y-3">
                {/* Google */}
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full font-medium button flex items-center justify-center gap-2" // Ensure flex layout for icon alignment
                    onClick={() => handleSocialLogin('google')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                >
                   {isSocialSubmitting === 'google' ? (
                       <Loader2 className="h-5 w-5 animate-spin" />
                   ) : (
                       <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.3 109.8 8 244 8c66.8 0 125.3 24.5 170.4 64.1L361.5 128C321.5 91.8 284.3 71.4 244 71.4c-91.6 0-173.4 74.6-173.4 190.4 0 116.2 81.9 189.9 173.4 189.9 100.4 0 161.5-66.9 165.4-154.9H244V261.8h244z"></path></svg> // Simple Google SVG
                   )}
                   <span>Entrar com Google</span>
                </Button>
                 {/* Facebook */}
                 <Button
                     variant="outline"
                     size="lg"
                     className="w-full font-medium button bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-[#1877F2] flex items-center justify-center gap-2" // Facebook blue & flex
                     onClick={() => handleSocialLogin('facebook')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                   >
                    {isSocialSubmitting === 'facebook' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                       <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.8 90.7 226.4 209.3 245V327.7h-63V256h63v-54.6c0-62.2 37-96.5 93.7-96.5 27.1 0 55.5 4.8 55.5 4.8v61h-31.3c-30.8 0-40.4 19.1-40.4 38.7V256h68.8l-11 71.7h-57.8V501C413.3 482.4 504 379.8 504 256z"></path></svg> // Simple Facebook SVG
                    )}
                    <span>Entrar com Facebook</span>
                 </Button>
                {/* Twitter (X) - Use placeholder or generic icon due to potential complexity */}
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full font-medium button bg-black text-white hover:bg-black/90 border-black flex items-center justify-center gap-2" // Twitter/X black & flex
                    onClick={() => handleSocialLogin('twitter')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                >
                   {isSocialSubmitting === 'twitter' ? (
                       <Loader2 className="h-5 w-5 animate-spin" />
                   ) : (
                        // Simple X SVG as placeholder
                       <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                   )}
                   <span>Entrar com X (Twitter)</span>
                </Button>
             </div>


           {/* Link to Signup */}
           <div className="mt-8 text-center text-sm">
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
