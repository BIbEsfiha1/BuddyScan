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
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
import Image from 'next/image';
// import { useAuth } from '@/context/auth-context'; // Authentication disabled

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
  const [loginError, setLoginError] = useState<string | null>(null);
  // const { user, loading: authLoading } = useAuth(); // Authentication disabled
  const user = null; // Placeholder
  const authLoading = false; // Placeholder

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

   // Redirect if user is already logged in - Kept for when auth is re-enabled
   useEffect(() => {
       if (!authLoading && user) {
           console.log("User already logged in, redirecting to dashboard...");
           router.replace('/dashboard'); // Use replace to avoid login in history
       }
   }, [user, authLoading, router]);


  // --- Email/Password Login Handler ---
  const onEmailSubmit = async (data: LoginFormInputs) => {
     console.warn("Login com email e senha está desabilitado.");
     toast({ variant: "destructive", title: "Login Desabilitado", description: "O login com email e senha está temporariamente desabilitado." });
  };

  // --- Social Login Handler ---
   const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
        console.warn("Login social está desabilitado.");
        toast({ variant: "destructive", title: "Login Desabilitado", description: "O login com redes sociais está temporariamente desabilitado." });
   };

   // Show loading state while checking auth status or if user is already defined
   // Disabled as auth is disabled
   /*
   if (authLoading || user) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
             <Card className="w-full max-w-md text-center shadow-lg card p-6">
                 <CardHeader>
                     <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                     <CardTitle>Carregando...</CardTitle>
                     <CardDescription>Verificando sessão...</CardDescription>
                 </CardHeader>
             </Card>
          </div>
      );
   }
   */


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
           {/* Use Next.js Image component for the logo */}
           <Image
               src="/buddyscan-logo.png" // Ensure this path is correct (relative to public folder)
               alt="BuddyScan Logo"
               width={180} // Set appropriate width
               height={51} // Set appropriate height based on aspect ratio
               priority // Load logo quickly
               className="mx-auto mb-4" // Keep styling for centering etc.
           />
          <CardTitle className="text-2xl font-bold text-primary">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para acessar seu painel BuddyScan.</CardDescription>
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

           {/* Login Form - Disabled */}
            <div className="space-y-4 opacity-50 pointer-events-none">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    {...register('email')}
                    disabled={true} // Always disabled
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
                    disabled={true} // Always disabled
                    className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                     aria-invalid={errors.password ? "true" : "false"}
                  />
                   {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                {loginError && (
                  <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{loginError}</p>
                )}

                <Button type="submit" className="w-full font-semibold button" disabled={true}> {/* Always disabled */}
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar (Desabilitado)
                </Button>
            </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Social Login Buttons - Disabled */}
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={true} // Always disabled
              className="button justify-center gap-2"
            >
              <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>
              Google (Desabilitado)
            </Button>
            {/* Placeholder for other social logins */}
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
  );
}

    