'use client';

import React, { useState, useEffect } from 'react';
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
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
// Import auth instance directly from the client config
import { auth } from '@/lib/firebase/client';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema for email/password login
const loginSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoginLoading, setSocialLoginLoading] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { user, loading: authLoading, authError: contextAuthError } = useAuth();
  const isAuthEnabled = true; // Auth is enabled

  // Determine if there's a critical initialization error
  const isAuthUnavailable = !auth || !!contextAuthError;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  // REMOVED: useEffect hook that checked auth context user state for redirection.
  // Middleware should handle redirecting logged-in users away from /login.
  // Let the AuthProvider handle showing its own loading state.

  // --- Handle Firebase Errors ---
  const handleAuthError = (error: any, providerName: string) => {
    setIsLoading(false);
    setSocialLoginLoading(null);
    console.error(`${providerName} login error:`, error);
    let userMessage = 'Ocorreu um erro durante o login. Tente novamente.';
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          userMessage = 'Email ou senha inválidos.';
          break;
        case 'auth/invalid-email':
          userMessage = 'O formato do email é inválido.';
          break;
        case 'auth/user-disabled':
          userMessage = 'Este usuário foi desabilitado.';
          break;
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          userMessage = 'Login cancelado pelo usuário.';
          break;
        case 'auth/popup-blocked':
          userMessage = 'Popup de login bloqueado pelo navegador.';
          break;
        case 'auth/account-exists-with-different-credential':
          userMessage = 'Já existe uma conta com este email usando outro método de login.';
          break;
        case 'auth/network-request-failed':
          userMessage = 'Erro de rede. Verifique sua conexão.';
          break;
        case 'auth/argument-error':
          userMessage = "Erro de configuração interna (authDomain inválido ou API key?). Verifique a configuração do Firebase e as variáveis de ambiente (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN). Contate o suporte.";
          console.error("Auth Argument Error - Check Firebase config (authDomain in .env.local, API Key restrictions, authorized domains in Firebase Console).");
          break;
        case 'auth/invalid-api-key':
        case 'auth/api-key-not-valid':
          userMessage = "Erro crítico: Chave de API inválida.";
          console.error("CRITICAL: Invalid Firebase API Key.");
          break;
        default:
          userMessage = `Erro de login (${error.code}).`;
      }
    }
    setLoginError(userMessage);
    toast({
      variant: 'destructive',
      title: `Erro de Login (${providerName})`,
      description: userMessage,
    });
  };

  // --- Email/Password Login Handler ---
  const onEmailSubmit = async (data: LoginFormInputs) => {
    if (!isAuthEnabled || isAuthUnavailable || !auth) { // Add !auth check
      setLoginError("Serviço de autenticação indisponível.");
      toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    try {
      console.log('Attempting email login for:', data.email);
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('Email login successful:', userCredential.user.email);
      toast({ title: "Login bem-sucedido!", description: `Bem-vindo de volta!` });
      router.push('/dashboard'); // Redirect to dashboard on success
    } catch (error: any) {
      handleAuthError(error, 'Email');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Social Login Handler ---
  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
    if (!isAuthEnabled || isAuthUnavailable || !auth) { // Add !auth check
      setLoginError("Serviço de autenticação indisponível.");
      toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
      return;
    }

    let provider: GoogleAuthProvider | OAuthProvider;
    let providerName = '';

    switch (providerType) {
      case 'google':
        provider = new GoogleAuthProvider();
        providerName = 'Google';
        break;
      case 'facebook':
      case 'twitter':
        toast({ variant: "destructive", title: "Indisponível", description: `Login com ${providerType === 'facebook' ? 'Facebook' : 'Twitter (X)'} ainda não implementado.` });
        return;
      default:
        toast({ variant: "destructive", title: "Erro", description: "Método de login desconhecido." });
        return;
    }

    setSocialLoginLoading(providerName);
    setLoginError(null);

    try {
      console.log(`--- [DEBUG] Initiating ${providerName} signInWithPopup ---`);
      console.log("[DEBUG] Auth Instance Config (Login):", auth.config);
      if (auth.config.authDomain !== process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
        console.error(`[CRITICAL DEBUG] Mismatch detected! Initial config authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}", Auth instance authDomain: "${auth.config.authDomain}". Check .env.local and Firebase Console -> Authorized domains.`);
      }
      if (!auth.config?.authDomain) {
        console.error("FATAL: authDomain is missing or invalid in Firebase Auth config. This is the likely cause of auth/argument-error for popup logins.");
        throw new Error("authDomain inválido ou ausente na configuração do Firebase.");
      }

      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      console.log(`${providerName} login successful. User:`, loggedInUser.email, loggedInUser.uid);

      toast({ title: "Login bem-sucedido!", description: `Conectado com ${providerName}.` });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(`Error during ${providerName} signInWithPopup:`, error);
      handleAuthError(error, providerName);
    } finally {
      setSocialLoginLoading(null);
    }
  };

   // Show only the AuthProvider's loading state if auth is still loading
   // The AuthProvider itself renders a loading screen now
   if (authLoading) {
       return null; // Or a minimal skeleton if preferred, but AuthProvider handles the main one
   }

   // If user is already logged in (checked after initial loading), redirect immediately
   // This might be redundant if middleware is effective, but provides a client-side fallback.
   if (user && !authLoading) {
       console.log("User logged in (client-side check), redirecting...");
       router.replace('/dashboard');
       return null; // Prevent rendering the login form while redirecting
   }


  return (
    <TooltipProvider>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
        <Card className="w-full max-w-md shadow-xl border-primary/20 card">
          <CardHeader className="text-center">
            <Image
              src="/buddyscan-logo.png"
              alt="BuddyScan Logo"
              width={180}
              height={66}
              className="mx-auto mb-4 object-contain h-[66px]"
              priority
            />
            <CardTitle className="text-2xl font-bold text-primary">Bem-vindo de volta!</CardTitle>
            <CardDescription>Faça login para acessar seu painel BuddyScan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAuthUnavailable && contextAuthError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro Crítico de Autenticação</AlertTitle>
                <AlertDescription>
                  {contextAuthError.message}. A autenticação pode não funcionar. Verifique as configurações ou contate o suporte.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  {...register('email')}
                  disabled={isLoading || isAuthUnavailable || !!socialLoginLoading || !isAuthEnabled}
                  className={`input ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  {...register('password')}
                  disabled={isLoading || isAuthUnavailable || !!socialLoginLoading || !isAuthEnabled}
                  className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={errors.password ? "true" : "false"}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {loginError && !isAuthUnavailable && (
                <Alert variant="destructive" className="p-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Login</AlertTitle>
                  <AlertDescription className="text-sm">{loginError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full font-semibold button" disabled={isLoading || isAuthUnavailable || !!socialLoginLoading || !isAuthEnabled}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
              {!isAuthEnabled && (
                <p className="text-xs text-center text-muted-foreground mt-2">O login está temporariamente desativado.</p>
              )}
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn((!isAuthEnabled || isAuthUnavailable) && 'cursor-not-allowed')}>
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isLoading || isAuthUnavailable || !!socialLoginLoading || !isAuthEnabled}
                      className="button justify-center gap-2 w-full"
                    >
                      {socialLoginLoading === 'Google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>}
                      {socialLoginLoading === 'Google' ? 'Conectando...' : ('Continuar com Google')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!isAuthEnabled || isAuthUnavailable) && (
                  <TooltipContent>
                    <p>Login com Google está temporariamente indisponível.</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={true}
                className="button justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.14 9.5 5.35V7.46H6.11v4.05H9.5v10h5V11.51h3.27l.59-4.05z"></path></svg>
                Facebook (Em Breve)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('twitter')}
                disabled={true}
                className="button justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                Twitter/X (Em Breve)
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground justify-center">
            Não tem uma conta?{' '}
            <Button variant="link" className="p-0 pl-1 h-auto text-primary" asChild>
              <Link href="/signup">Cadastre-se</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
