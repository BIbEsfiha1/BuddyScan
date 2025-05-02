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
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import auth and potential init error
import Link from 'next/link';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert for init error

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
     // *** CRITICAL CHECK: Ensure auth is initialized and no errors occurred ***
     if (!auth || firebaseInitializationError) {
        const errorMsg = firebaseInitializationError?.message || "Autenticação não está disponível.";
        console.error("Signup attempt aborted due to Firebase config error:", errorMsg);
        setSubmitError(errorMsg);
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: errorMsg });
        return; // Prevent further execution
     }
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
       // Set cookie after signup
       document.cookie = "firebaseAuthToken=true; path=/; max-age=3600";
       router.push('/'); // Redirect to dashboard
       router.refresh(); // Refresh after redirect
    } catch (error: any) {
      console.error('Erro no cadastro com email:', error);
      let errorMsg = 'Falha ao criar a conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este email já está em uso. Tente fazer login.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'O formato do email é inválido.';
      } else if (error.code === 'auth/weak-password') {
          errorMsg = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      } else if (error.code === 'auth/network-request-failed') {
           errorMsg = 'Erro de rede. Verifique sua conexão com a internet.';
      } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key' || error.message?.includes('api-key-not-valid')) {
         // *** Specific error for invalid API key DURING signup attempt ***
         errorMsg = 'Erro de Configuração Crítico: A chave de API do Firebase é inválida. Verifique o arquivo .env.local.';
         console.error("Detailed Error: Invalid Firebase API Key during createUserWithEmailAndPassword. Check NEXT_PUBLIC_FIREBASE_API_KEY.");
      }
      setSubmitError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: errorMsg,
        duration: 9000, // Show longer for config errors
      });
    } finally {
      setIsSubmitting(false);
    }
  };

   // --- Social Signup/Login Handler (signInWithPopup handles both) ---
   const handleSocialSignup = async (providerName: 'google' | 'facebook' | 'twitter') => {
        // *** CRITICAL CHECK: Ensure auth is initialized and no errors occurred ***
        if (!auth || firebaseInitializationError) {
            const errMsg = firebaseInitializationError?.message || "Autenticação não está disponível.";
            console.error("Social Signup attempt aborted due to Firebase config error:", errMsg);
            setSubmitError(errMsg);
            toast({ variant: 'destructive', title: 'Erro de Configuração', description: errMsg });
            return; // Prevent further execution
        }
      console.log(`Initiating social signup/login with ${providerName}...`);
      setIsSocialSubmitting(providerName);
      setSubmitError(null);
      let provider: GoogleAuthProvider | FacebookAuthProvider | TwitterAuthProvider;

      try {
         switch (providerName) {
             case 'google':
                 console.log("Creating GoogleAuthProvider instance.");
                 provider = new GoogleAuthProvider();
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
                 const invalidProviderMsg = `Invalid social provider name: ${providerName}`;
                 console.error(invalidProviderMsg);
                 setSubmitError('Provedor social inválido selecionado.');
                 toast({ variant: 'destructive', title: 'Erro Interno', description: 'Provedor social inválido.' });
                 setIsSocialSubmitting(null);
                 return; // Exit early
         }

        // Verify provider object
        if (!provider || typeof provider !== 'object') {
             const providerErrorMsg = `Failed to create provider instance for ${providerName}.`;
             console.error(providerErrorMsg);
             setSubmitError(`Erro ao configurar ${providerName}.`);
             toast({ variant: 'destructive', title: 'Erro de Configuração', description: `Não foi possível iniciar o login com ${providerName}.` });
             setIsSocialSubmitting(null);
             return;
        }

         // *** Detailed Logging before signInWithPopup ***
         console.log(`Attempting signInWithPopup for ${providerName}.`);
         console.log("Auth object:", auth ? 'Exists' : 'NULL', auth); // Log auth object status and value
         console.log("Provider object:", provider ? 'Exists' : 'NULL', provider); // Log provider object status and value


         // signInWithPopup will create a new user if they don't exist, or log in if they do
         const result = await signInWithPopup(auth, provider);
         const user = result.user;
         console.log(`${providerName} signup/login successful. User:`, user.email, user.uid);


         toast({
            title: 'Autenticação Realizada!',
            description: `Você foi autenticado com sucesso usando ${providerName}.`,
            variant: 'default',
         });
          // Set cookie after social auth
          document.cookie = "firebaseAuthToken=true; path=/; max-age=3600";
          router.push('/'); // Redirect to dashboard
          router.refresh(); // Refresh after redirect

      } catch (error: any) {
          console.error(`Erro na autenticação com ${providerName}:`, error); // Log full error
          let errorMsg = `Falha ao autenticar com ${providerName}.`;
         // Reuse error messages from login page for consistency
         if (error.code === 'auth/argument-error') {
            errorMsg = `Erro de configuração ao tentar autenticar com ${providerName}. Verifique se o provedor (${providerName}) está habilitado no Console do Firebase, se os domínios autorizados estão corretos e se as configurações de OAuth estão definidas corretamente. Código: ${error.code}`;
            console.error("Potential causes for auth/argument-error: Invalid 'auth' object, invalid 'provider' object, or Firebase project misconfiguration (OAuth settings, authorized domains, API key, enabled providers, etc.). Double-check .env.local variables and Firebase console settings.");
         } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMsg = `Já existe uma conta com este email (${error.customData?.email}). Tente fazer login com o provedor original.`;
         } else if (error.code === 'auth/popup-closed-by-user') {
             errorMsg = `Janela de autenticação com ${providerName} fechada antes da conclusão.`;
         } else if (error.code === 'auth/cancelled-popup-request') {
              errorMsg = `Mais de uma janela de autenticação foi aberta. Por favor, tente novamente.`;
         } else if (error.code === 'auth/popup-blocked') {
              errorMsg = `A janela de autenticação foi bloqueada pelo navegador. Habilite pop-ups para este site.`;
         } else if (error.code === 'auth/operation-not-allowed') {
             errorMsg = `Autenticação com ${providerName} não está habilitada nas configurações de autenticação do Firebase.`;
         } else if (error.code === 'auth/unauthorized-domain') {
             errorMsg = `Este domínio não está autorizado para operações do Firebase. Verifique os 'Domínios autorizados' nas configurações de autenticação do Firebase.`;
         } else if (error.code === 'auth/network-request-failed') {
              errorMsg = 'Erro de rede. Verifique sua conexão com a internet.';
         } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key' || error.message?.includes('api-key-not-valid')) {
             // Specific error for invalid API key during social login
             errorMsg = `Erro de Configuração Crítico (${providerName}): A chave de API do Firebase é inválida. Verifique o arquivo .env.local.`;
             console.error("Detailed Error: Invalid Firebase API Key during social login. Check NEXT_PUBLIC_FIREBASE_API_KEY.");
         }


          setSubmitError(errorMsg);
          toast({
            variant: 'destructive',
            title: `Erro na Autenticação com ${providerName}`,
            description: errorMsg,
            duration: 9000, // Show longer for config errors
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

             {/* Display Firebase Initialization Error if present */}
             {firebaseInitializationError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Configuração</AlertTitle>
                  <AlertDescription>
                    {firebaseInitializationError.message}. A autenticação pode não funcionar. Verifique as variáveis de ambiente.
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
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError} className="input" />
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
                       <Input type="password" placeholder="Repita a senha" {...field} disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError} className="input" />
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
              <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}>
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
                     className="w-full font-medium button flex items-center justify-center gap-2"
                     onClick={() => handleSocialSignup('google')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                 >
                    {isSocialSubmitting === 'google' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.3 109.8 8 244 8c66.8 0 125.3 24.5 170.4 64.1L361.5 128C321.5 91.8 284.3 71.4 244 71.4c-91.6 0-173.4 74.6-173.4 190.4 0 116.2 81.9 189.9 173.4 189.9 100.4 0 161.5-66.9 165.4-154.9H244V261.8h244z"></path></svg>
                    )}
                    <span>Continuar com Google</span>
                 </Button>
                  {/* Facebook */}
                  <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-medium button bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-[#1877F2] flex items-center justify-center gap-2"
                      onClick={() => handleSocialSignup('facebook')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                    >
                     {isSocialSubmitting === 'facebook' ? (
                         <Loader2 className="h-5 w-5 animate-spin" />
                     ) : (
                        <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.8 90.7 226.4 209.3 245V327.7h-63V256h63v-54.6c0-62.2 37-96.5 93.7-96.5 27.1 0 55.5 4.8 55.5 4.8v61h-31.3c-30.8 0-40.4 19.1-40.4 38.7V256h68.8l-11 71.7h-57.8V501C413.3 482.4 504 379.8 504 256z"></path></svg>
                     )}
                    <span>Continuar com Facebook</span>
                  </Button>
                 {/* Twitter (X) */}
                 <Button
                     variant="outline"
                     size="lg"
                     className="w-full font-medium button bg-black text-white hover:bg-black/90 border-black flex items-center justify-center gap-2"
                     onClick={() => handleSocialSignup('twitter')}
                    disabled={isSubmitting || !!isSocialSubmitting || !!firebaseInitializationError}
                 >
                    {isSocialSubmitting === 'twitter' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    )}
                    <span>Continuar com X (Twitter)</span>
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
