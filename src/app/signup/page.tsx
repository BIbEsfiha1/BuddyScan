
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SignupPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately on mount
    console.log("Signup page accessed, redirecting to home (signup disabled)...");
    router.replace('/'); // Use replace to avoid adding signup to history
  }, [router]);

  // Render a loading/redirecting state while the redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md text-center shadow-lg card p-6">
         <CardHeader>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
           <CardTitle>Redirecionando...</CardTitle>
           <CardDescription>O cadastro está temporariamente desabilitado.</CardDescription>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">Você será redirecionado para a página inicial.</p>
         </CardContent>
       </Card>
    </div>
  );
}

// Original Signup Page Code (kept for reference, but not used due to redirect)
/*
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
import Image from 'next/image';

// Schema for signup form
const signupSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'], // Error path for password confirmation
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  // --- Email/Password Signup Handler ---
  const onEmailSubmit = async (data: SignupFormInputs) => {
    setIsLoading(true);
    setSignupError(null);

    if (firebaseInitializationError) {
        console.error("Firebase initialization error:", firebaseInitializationError);
        setSignupError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível registrar.`);
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
        setIsLoading(false);
        return;
    }
     if (!auth) {
         setSignupError("Serviço de autenticação não está pronto. Tente novamente em breve.");
         toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
         setIsLoading(false);
         return;
     }

    try {
      console.log('Attempting email signup for:', data.email);
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log('Email signup successful for:', user.email, 'UID:', user.uid);
      toast({
        title: 'Cadastro Realizado!',
        description: `Sua conta foi criada com sucesso. Bem-vindo!`,
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard after signup
    } catch (error: any) {
      console.error('Email signup failed:', error);
      let errorMessage = 'Falha no cadastro. Tente novamente.';
      if (error.code) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  errorMessage = 'Este email já está em uso por outra conta.';
                  break;
              case 'auth/invalid-email':
                  errorMessage = 'Formato de email inválido.';
                  break;
              case 'auth/weak-password':
                  errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                  break;
              default:
                  errorMessage = `Erro de cadastro: ${error.message}`;
          }
      }
      setSignupError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

   // --- Social Login/Signup Handler ---
   // Same handler as login page, Firebase handles linking or creation automatically
   const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
      setIsLoading(true);
      setSignupError(null);

      if (firebaseInitializationError) {
          console.error("Firebase initialization error:", firebaseInitializationError);
          setSignupError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível registrar.`);
          toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
          setIsLoading(false);
          return;
      }
       if (!auth) {
           setSignupError("Serviço de autenticação não está pronto. Tente novamente em breve.");
           toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
           setIsLoading(false);
           return;
       }

      let provider;
      let providerName = '';

      try {
          switch (providerType) {
              case 'google':
                  provider = new GoogleAuthProvider();
                  providerName = 'Google';
                  break;
              // Add Facebook and Twitter providers here if needed
              // case 'facebook': provider = new OAuthProvider('facebook.com'); providerName = 'Facebook'; break;
              // case 'twitter': provider = new OAuthProvider('twitter.com'); providerName = 'X (Twitter)'; break;
              default:
                  throw new Error('Provedor social não suportado.');
          }

          console.log(`Attempting signInWithPopup for ${providerName} (Signup/Login)...`);
           if (!auth) { // Re-check auth right before use
              throw new Error("Auth instance became null before signInWithPopup call.");
           }
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          console.log(`${providerName} signup/login successful. User:`, user.email, user.uid);
          toast({
              title: `Login/Cadastro com ${providerName} bem-sucedido!`,
              description: `Bem-vindo, ${user.displayName || user.email}!`,
              variant: 'default',
          });
          router.push('/'); // Redirect to dashboard
      } catch (error: any) {
          console.error(`${providerName} signup/login failed:`, error);
           let errorMessage = `Falha no login/cadastro com ${providerName}.`;
           if (error.code) {
              // Reuse error handling from login page
               switch (error.code) {
                   case 'auth/account-exists-with-different-credential':
                       errorMessage = 'Já existe uma conta com este email usando um método de login diferente.';
                       break;
                   case 'auth/popup-closed-by-user':
                       errorMessage = 'Janela de login fechada antes da conclusão.';
                       break;
                   case 'auth/cancelled-popup-request':
                        errorMessage = 'Múltiplas tentativas de login. Por favor, tente novamente.';
                        break;
                   case 'auth/popup-blocked':
                       errorMessage = 'O popup de login foi bloqueado pelo navegador. Por favor, habilite popups para este site.';
                       break;
                   case 'auth/argument-error':
                       errorMessage = `Erro de configuração do provedor ${providerName}. Verifique as configurações no Firebase Console. (auth/argument-error)`;
                       break;
                   case 'auth/operation-not-allowed':
                        errorMessage = `Login com ${providerName} não está habilitado no projeto Firebase.`;
                        break;
                   default:
                       errorMessage = `Erro de login/cadastro com ${providerName}: ${error.message}`;
               }
           }
           setSignupError(errorMessage);
          toast({
              variant: 'destructive',
              title: `Falha no Login/Cadastro com ${providerName}`,
              description: errorMessage,
          });
      } finally {
          setIsLoading(false);
      }
   };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
           <Image
                src="/budscan-logo.png"
                alt="BudScan Logo"
                width={180}
                height={51}
                priority
                className="mx-auto mb-4"
           />
          <CardTitle className="text-2xl font-bold text-primary">Crie sua Conta BudScan</CardTitle>
          <CardDescription>Cadastre-se para começar a monitorar suas plantas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             {firebaseInitializationError && (
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro de Configuração</AlertTitle>
                     <AlertDescription>
                         {firebaseInitializationError.message}. A autenticação pode não funcionar.
                     </AlertDescription>
                 </Alert>
             )}

          <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
              <Input
                id="email-signup"
                type="email"
                placeholder="seuemail@exemplo.com"
                {...register('email')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Senha</Label>
              <Input
                id="password-signup"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.password ? "true" : "false"}
              />
               {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword-signup" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Confirmar Senha</Label>
              <Input
                id="confirmPassword-signup"
                type="password"
                placeholder="Repita a senha"
                {...register('confirmPassword')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
               {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            {signupError && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{signupError}</p>
            )}

            <Button type="submit" className="w-full font-semibold button" disabled={isLoading || !!firebaseInitializationError}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Cadastrar com Email
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou cadastre-se com</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || !!firebaseInitializationError}
              className="button justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>}
              Google
            </Button>
            {/* Placeholder for other social logins */
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground justify-center">
          Já tem uma conta?{' '}
          <Button variant="link" className="p-0 pl-1 h-auto text-primary" asChild>
            <Link href="/login">Faça login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
*/
```
    </content>
  </change>
  <change>
    <file>src/app/layout.tsx</file