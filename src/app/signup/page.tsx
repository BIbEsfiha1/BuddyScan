
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
import { UserPlus, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
// Using standard img tag now
// import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip
import { cn } from '@/lib/utils'; // Import cn
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

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
  const [socialLoginLoading, setSocialLoginLoading] = useState<string | null>(null); // Added social loading state
  const [signupError, setSignupError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth(); // Use auth context
  const isAuthEnabled = true; // Keep auth enabled

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

   // Redirect if user is already logged in AND auth is enabled
   useEffect(() => {
       if (isAuthEnabled && !authLoading && user) {
           console.log("User already logged in, redirecting to dashboard from signup...");
           router.replace('/dashboard'); // Use replace to avoid signup in history
       }
   }, [user, authLoading, router, isAuthEnabled]);

    // --- Handle Firebase Errors ---
    const handleAuthError = (error: any, providerName: string) => {
        setIsLoading(false);
        setSocialLoginLoading(null);
        console.error(`${providerName} signup/login error:`, error);
        let userMessage = 'Ocorreu um erro durante o cadastro/login. Tente novamente.';
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'Este email já está em uso. Tente fazer login ou use outro email.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'O formato do email é inválido.';
                    break;
                case 'auth/operation-not-allowed':
                    userMessage = 'Cadastro com este método desabilitado. Tente usar Google.';
                    break;
                case 'auth/popup-closed-by-user':
                    userMessage = 'Cadastro/Login cancelado pelo usuário.';
                    break;
                case 'auth/cancelled-popup-request':
                case 'auth/popup-blocked':
                    userMessage = 'Popup de login bloqueado pelo navegador. Habilite popups para este site.';
                    break;
                case 'auth/account-exists-with-different-credential':
                     // This usually happens during social sign-in attempts
                    userMessage = 'Já existe uma conta com este email usando outro método (ex: Email, Google). Tente fazer login com o método original.';
                    break;
                 case 'auth/network-request-failed':
                      userMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
                      break;
                 case 'auth/internal-error':
                      userMessage = 'Ocorreu um erro interno no servidor de autenticação. Tente novamente mais tarde.';
                      break;
                 case 'auth/invalid-api-key': // Corrected code
                 case 'auth/api-key-not-valid':
                     userMessage = "Erro de configuração: Chave de API inválida. Contate o suporte.";
                     console.error("CRITICAL: Invalid Firebase API Key detected during signup.");
                     break;
                 case 'auth/argument-error': // Often related to invalid authDomain
                      userMessage = "Erro de configuração interna (authDomain inválido ou API key?). Verifique a configuração do Firebase e as variáveis de ambiente (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN). Contate o suporte.";
                      console.error("CRITICAL: Auth Argument Error - Likely Firebase config issue (check authDomain, projectId).", error);
                      break;
                 case 'auth/invalid-credential': // Can happen if email format is wrong during create
                     userMessage = 'Formato de email inválido.';
                     break;
                default:
                    userMessage = `Erro de cadastro/login (${error.code}). Tente novamente.`;
            }
        } else if (error.message) {
            userMessage = error.message;
        }
        setSignupError(userMessage);
        toast({
            variant: 'destructive',
            title: `Erro de Cadastro/Login (${providerName})`,
            description: userMessage,
        });
    };

  // --- Email/Password Signup Handler ---
  const onEmailSubmit = async (data: SignupFormInputs) => {
       // Check if auth is enabled first
       if (!isAuthEnabled) {
           console.warn("Email signup attempted while auth is disabled.");
           return;
       }
       // Check if auth instance is available
       if (!auth) {
           console.error("Email signup failed: Auth instance not available.");
           setSignupError("Serviço de autenticação indisponível.");
           toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
           return;
       }
       // Check for critical Firebase initialization error
       if (firebaseInitializationError) {
           console.error("Email signup failed due to Firebase initialization error:", firebaseInitializationError.message);
           setSignupError(`Erro de Configuração: ${firebaseInitializationError.message}`);
           toast({ variant: "destructive", title: "Erro de Configuração", description: firebaseInitializationError.message });
           return;
       }

     setIsLoading(true);
     setSignupError(null);
     try {
       console.log('Attempting email signup for:', data.email);
       const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
       const user = userCredential.user;
       console.log('Email signup successful for:', user.email, 'UID:', user.uid);
       toast({ title: "Cadastro realizado!", description: `Bem-vindo ao BuddyScan, ${user.email}!` });
       router.push('/dashboard'); // Redirect on success
     } catch (error: any) {
        handleAuthError(error, 'Email');
     } finally {
       setIsLoading(false);
     }
  };

   // --- Social Login/Signup Handler ---
   const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
        // Check if auth is enabled first
        if (!isAuthEnabled) {
            console.warn(`${providerType} signup attempted while auth is disabled.`);
            return;
        }
        // Check if auth instance is available
        if (!auth) {
            console.error(`${providerType} login/signup failed: Auth instance not available.`);
            setSignupError("Serviço de autenticação indisponível.");
            toast({ variant: "destructive", title: "Erro", description: "Serviço de autenticação indisponível." });
            return;
        }
        // Check for critical Firebase initialization error
        if (firebaseInitializationError) {
            console.error(`${providerType} login failed: Firebase initialization error.`);
            setSignupError(`Erro de Configuração: ${firebaseInitializationError.message}`);
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
                toast({ variant: "destructive", title: "Erro", description: "Método de login/cadastro desconhecido." });
                return;
        }

       setSocialLoginLoading(providerName);
       setSignupError(null);

        try {
            console.log(`--- [DEBUG] Initiating ${providerName} signInWithPopup (Signup Page) ---`);
            console.log("[DEBUG] Auth Instance Available:", !!auth);
             if (!auth) { // Double check auth right before the call
                throw new Error("Auth instance became null before signInWithPopup call.");
             }
             // Log the specific config details of the auth instance being used RIGHT BEFORE the call
             console.log("[DEBUG] Auth Config Used by Instance (Signup):");
              console.log(" auth.config:", auth.config);
             console.log("  apiKey:", auth.config.apiKey ? 'Present' : 'MISSING!');
             console.log("  authDomain:", auth.config.authDomain || 'MISSING! (Likely cause of auth/argument-error)');
             console.log("  projectId:", auth.config.projectId || 'MISSING!');


             if (!provider) { // Should not happen based on switch logic, but check anyway
                throw new Error("Provider instance is null or undefined.");
             }
             if (!auth.config.authDomain) {
                 console.error("FATAL: authDomain is missing or invalid in Firebase Auth config. This is the likely cause of auth/argument-error for popup logins.");
                 throw new Error("authDomain inválido ou ausente na configuração do Firebase.");
             }
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log(`${providerName} login/signup successful. User:`, user.email, user.uid);
            toast({ title: "Conectado!", description: `Bem-vindo ao BuddyScan via ${providerName}.` });
            router.push('/dashboard');
        } catch (error: any) {
             console.error(`Error during ${providerName} signInWithPopup (Signup):`, error);
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
           {/* Standard img tag */}
             <img
                 src="/buddyscan-logo.png" // Direct path to public folder
                 alt="BuddyScan Logo"
                 width={180} // Adjust width as needed
                 height={66} // Adjust height based on aspect ratio
                 className="mx-auto mb-4 object-contain h-[66px]" // Ensure proper scaling
                 // No onError needed for standard img if we check network tab for 404
                 onError={(e) => {
                     console.error('Standard <img> load error (Signup):', (e.target as HTMLImageElement).src);
                     // Optionally set a fallback or hide the image on error
                 }}
             />
          <CardTitle className="text-2xl font-bold text-primary">Crie sua Conta BuddyScan</CardTitle>
          <CardDescription>Cadastre-se para começar a monitorar suas plantas.</CardDescription>
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

          {/* Signup Form */}
           <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="email-signup" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  {...register('email')}
                  disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth disabled
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
                   disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth disabled
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
                   disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled} // Disable if auth disabled
                  className={`input ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                />
                 {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

               {signupError && (
                 <Alert variant="destructive" className="p-3">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Erro de Cadastro</AlertTitle>
                    <AlertDescription className="text-sm">{signupError}</AlertDescription>
                  </Alert>
               )}

              <Button type="submit" className="w-full font-semibold button" disabled={isLoading || !!firebaseInitializationError || !!socialLoginLoading || !isAuthEnabled}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                 {isLoading ? 'Cadastrando...' : ('Cadastrar com Email')}
              </Button>
              {/* Add message if auth is disabled */}
               {!isAuthEnabled && (
                   <p className="text-xs text-center text-muted-foreground mt-2">O cadastro está temporariamente desativado.</p>
               )}
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
             {/* Social Signup Buttons */}
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
                          {socialLoginLoading === 'Google' ? 'Conectando...' : ('Cadastrar com Google')}
                       </Button>
                    </span>
                </TooltipTrigger>
                 {!isAuthEnabled && (
                     <TooltipContent>
                        <p>Cadastro está temporariamente desabilitado.</p>
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
          Já tem uma conta?{' '}
          <Button variant="link" className="p-0 pl-1 h-auto text-primary" asChild>
            <Link href="/login">Faça login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
    </TooltipProvider>
  );
}
