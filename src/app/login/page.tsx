
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
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider, getRedirectResult } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
// Use standard img tag
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip
import { cn } from '@/lib/utils'; // Import cn
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert

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
  const [socialLoginLoading, setSocialLoginLoading] = useState<string | null>(null); // Loading state for specific provider
  const [loginError, setLoginError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth(); // Use auth context
  const isAuthEnabled = true; // Keep auth enabled

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

   // Redirect if user is already logged in AND auth is enabled
   useEffect(() => {
       if (isAuthEnabled && !authLoading && user) {
           console.log("User already logged in, redirecting to dashboard...");
           router.replace('/dashboard'); // Use replace to avoid login in history
       }
   }, [user, authLoading, router, isAuthEnabled]);

   // --- Handle Firebase Errors ---
   const handleAuthError = (error: any, providerName: string) => {
        setIsLoading(false);
        setSocialLoginLoading(null);
        console.error(`${providerName} login error:`, error);
        let userMessage = 'Ocorreu um erro durante o login. Tente novamente.';
        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential': // Often means wrong email or password
                    userMessage = 'Email ou senha inválidos. Verifique seus dados ou cadastre-se.';
                    break;
                case 'auth/wrong-password': // Less common, but keep for specificity
                    userMessage = 'Senha incorreta. Tente novamente.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'O formato do email é inválido.';
                    break;
                case 'auth/user-disabled':
                    userMessage = 'Este usuário foi desabilitado.';
                    break;
                case 'auth/popup-closed-by-user':
                    userMessage = 'Login cancelado pelo usuário.';
                    break;
                case 'auth/cancelled-popup-request':
                case 'auth/popup-blocked':
                    userMessage = 'Popup de login bloqueado pelo navegador. Habilite popups para este site.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    userMessage = 'Já existe uma conta com este email usando outro método de login (ex: Google, Email). Tente fazer login com o método original.';
                    break;
                case 'auth/network-request-failed':
                     userMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
                     break;
                case 'auth/internal-error':
                     userMessage = 'Ocorreu um erro interno no servidor de autenticação. Tente novamente mais tarde.';
                     break;
                 case 'auth/invalid-api-key':
                 case 'auth/api-key-not-valid':
                     userMessage = "Erro de configuração: Chave de API inválida. Contate o suporte.";
                     console.error("CRITICAL: Invalid Firebase API Key detected during login.");
                     break;
                 case 'auth/argument-error': // Often related to invalid authDomain
                     userMessage = "Erro de configuração interna (authDomain inválido ou API key?). Verifique a configuração do Firebase e as variáveis de ambiente (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN). Contate o suporte.";
                     console.error("CRITICAL: Auth Argument Error - Likely Firebase config issue (check authDomain, projectId, apiKey).", error);
                     break;
                 case 'auth/operation-not-allowed':
                      userMessage = "Login com este método está desabilitado no momento.";
                      break;
                default:
                    userMessage = `Erro de login (${error.code}). Tente novamente.`;
            }
        } else if (error.message) {
            // Handle potential non-Firebase errors
            userMessage = error.message;
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
      // Check if auth is enabled first (redundant if UI is disabled, but good practice)
      if (!isAuthEnabled) {
        // This case should ideally not be reachable if the button is disabled
        console.warn("Email login attempted while auth is disabled.");
        return;
      }
      // Check if auth instance is available
      if (!auth) {
        console.error("Email login failed: Auth instance not available.");
        setLoginError("Serviço de autenticação indisponível.");
        toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
        return;
      }
       // Check for critical Firebase initialization error
       if (firebaseInitializationError) {
           console.error("Email login failed: Firebase initialization error.");
           setLoginError(`Erro de Configuração: ${firebaseInitializationError.message}`);
           toast({ variant: "destructive", title: "Erro de Configuração", description: firebaseInitializationError.message });
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
       // Check if auth is enabled first
       if (!isAuthEnabled) {
           console.warn(`${providerType} login attempted while auth is disabled.`);
           return;
       }
       // Check if auth instance is available
       if (!auth) {
           console.error(`${providerType} login failed: Auth instance not available.`);
           setLoginError("Serviço de autenticação indisponível.");
           toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
           return;
       }
       // Check for critical Firebase initialization error
        if (firebaseInitializationError) {
            console.error(`${providerType} login failed: Firebase initialization error.`);
            setLoginError(`Erro de Configuração: ${firebaseInitializationError.message}`);
            toast({ variant: "destructive", title: "Erro de Configuração", description: firebaseInitializationError.message });
            return;
        }


        let provider: GoogleAuthProvider | OAuthProvider; // Define type explicitly
        let providerName = '';

        switch (providerType) {
            case 'google':
                provider = new GoogleAuthProvider();
                providerName = 'Google';
                break;
            case 'facebook':
                toast({ variant: "destructive", title: "Indisponível", description: "Login com Facebook ainda não implementado." });
                return;
            case 'twitter':
                toast({ variant: "destructive", title: "Indisponível", description: "Login com Twitter (X) ainda não implementado." });
                return;
            default:
                console.error('Provider type desconhecido:', providerType);
                toast({ variant: "destructive", title: "Erro", description: "Método de login desconhecido." });
                return;
        }

        setSocialLoginLoading(providerName);
        setLoginError(null);

        try {
            console.log(`--- [DEBUG] Initiating ${providerName} signInWithPopup ---`);
            console.log("[DEBUG] Auth Instance Available:", !!auth);
            // Log the specific config details of the auth instance being used RIGHT BEFORE the call
            if (auth) {
                console.log("[DEBUG] Auth Config Used by Instance:");
                console.log(" auth.config:", auth.config);
                console.log("  apiKey:", auth.config.apiKey ? 'Present' : 'MISSING!');
                console.log("  authDomain:", auth.config.authDomain || 'MISSING! (Likely cause of auth/argument-error)');
                console.log("  projectId:", auth.config.projectId || 'MISSING!');
            } else {
                 console.error("CRITICAL Error: Auth instance is null just before signInWithPopup!");
                 throw new Error("Auth instance is null or undefined.");
            }

             if (!provider) { // Should not happen based on switch logic, but check anyway
                throw new Error("Provider instance is null or undefined.");
             }
             // Explicitly check authDomain right before the call
             if (!auth.config.authDomain) {
                 console.error("FATAL: authDomain is missing or invalid in Firebase Auth config. This is the likely cause of auth/argument-error for popup logins.");
                 throw new Error("authDomain inválido ou ausente na configuração do Firebase.");
             }
            // Use signInWithPopup for social logins
            const result = await signInWithPopup(auth, provider); // This is the line that often throws auth/argument-error
            const user = result.user;
            console.log(`${providerName} login successful. User:`, user.email, user.uid);

            toast({ title: "Login bem-sucedido!", description: `Conectado com ${providerName}.` });
            router.push('/dashboard');
        } catch (error: any) {
             // Log the error *before* calling handleAuthError for more context
             console.error(`Error during ${providerName} signInWithPopup:`, error);
             handleAuthError(error, providerName);
        } finally {
            setSocialLoginLoading(null);
        }
   };

   // Show loading state while checking auth status or if user is already defined (only if auth is enabled)
   if (isAuthEnabled && (authLoading || (!authLoading && user))) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
             <Card className="w-full max-w-md text-center shadow-lg card p-6">
                 <CardHeader>
                     <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                     <CardTitle>Carregando...</CardTitle>
                     <CardDescription>
                        {user ? 'Redirecionando para o painel...' : 'Verificando sessão...'}
                     </CardDescription>
                 </CardHeader>
             </Card>
          </div>
      );
   }


  return (
    <TooltipProvider>
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
            {/* Standard img tag for easier debugging */}
             <img
                 src="/buddyscan-logo.png" // Direct path to public folder
                 alt="BuddyScan Logo"
                 width={180} // Adjust width as needed
                 height={66} // Adjust height based on aspect ratio
                 className="mx-auto mb-4 object-contain h-[66px]" // Ensure proper scaling
                 // Check network tab for 404s if the image doesn't load.
                 onError={(e) => {
                     console.error('Standard <img> load error (Login):', (e.target as HTMLImageElement).src);
                     // Optionally set a fallback or hide the image on error
                     // (e.target as HTMLImageElement).style.display = 'none';
                 }}
             />
          <CardTitle className="text-2xl font-bold text-primary">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para acessar seu painel BuddyScan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {firebaseInitializationError && (
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro Crítico de Configuração</AlertTitle>
                     <AlertDescription>
                         {firebaseInitializationError.message}. A autenticação pode não funcionar. Verifique as variáveis de ambiente (API Key, Auth Domain, etc.).
                     </AlertDescription>
                 </Alert>
             )}

           {/* Login Form */}
            <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    {...register('email')}
                    disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth is disabled
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
                    disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth is disabled
                    className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                     aria-invalid={errors.password ? "true" : "false"}
                  />
                   {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                {loginError && (
                  <Alert variant="destructive" className="p-3">
                     <AlertCircle className="h-4 w-4"/>
                     <AlertTitle>Erro de Login</AlertTitle>
                     <AlertDescription className="text-sm">{loginError}</AlertDescription>
                   </Alert>
                )}

                <Button type="submit" className="w-full font-semibold button" disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                   {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                 {/* Add message if auth is disabled */}
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
            {/* Social Login Buttons */}
             <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrap button in span if it might be disabled */}
                   <span className={cn(!isAuthEnabled && 'cursor-not-allowed')}>
                       <Button
                         variant="outline"
                         onClick={() => handleSocialLogin('google')}
                         disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth disabled
                         className="button justify-center gap-2 w-full"
                       >
                          {socialLoginLoading === 'Google' ? <Loader2 className="h-5 w-5 animate-spin"/> : <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>}
                          {socialLoginLoading === 'Google' ? 'Conectando...' : ('Continuar com Google')}
                       </Button>
                    </span>
                </TooltipTrigger>
                 {!isAuthEnabled && (
                    <TooltipContent>
                      <p>Login está temporariamente desabilitado.</p>
                    </TooltipContent>
                 )}
            </Tooltip>

            {/* Placeholder for other social logins */}
             <Button
               variant="outline"
               onClick={() => handleSocialLogin('facebook')}
               disabled={true} // Keep disabled until implemented or if auth disabled
               className="button justify-center gap-2 opacity-50 cursor-not-allowed"
             >
               <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.14 9.5 5.35V7.46H6.11v4.05H9.5v10h5V11.51h3.27l.59-4.05z"></path></svg>
               Facebook (Em Breve)
             </Button>
             <Button
               variant="outline"
               onClick={() => handleSocialLogin('twitter')}
               disabled={true} // Keep disabled until implemented or if auth disabled
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
