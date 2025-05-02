
 // src/components/app-header.tsx
 'use client';

 import React from 'react';
 import Link from 'next/link';
 import { Button } from '@/components/ui/button';
 import ThemeToggle from '@/components/theme-toggle';
 import { useAuth } from '@/context/auth-context';
 import { signOut } from 'firebase/auth';
 import { auth } from '@/lib/firebase/config';
 import { useRouter } from 'next/navigation';
 import { useToast } from '@/hooks/use-toast';
 import { Sprout, LogOut, UserCircle } from 'lucide-react'; // Added UserCircle

 export default function AppHeader() {
   const { user, loading } = useAuth();
   const router = useRouter();
   const { toast } = useToast();

   const handleLogout = async () => {
     try {
       await signOut(auth);
       toast({ title: 'Logout Realizado', description: 'Você saiu com sucesso.' });
       router.push('/login'); // Redirect to login after logout
     } catch (error) {
       console.error('Erro ao fazer logout:', error);
       toast({ variant: 'destructive', title: 'Erro no Logout', description: 'Não foi possível sair.' });
     }
   };

   // Don't render header content during initial auth loading
   if (loading) {
     return null; // Or a minimal loading state if preferred
   }

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-14 items-center justify-between">
         {/* Logo/Brand */}
         <Link href="/" className="flex items-center gap-2 mr-6">
           <Sprout className="h-6 w-6 text-primary" />
           <span className="font-bold text-primary tracking-tight hidden sm:inline-block">CannaLog</span>
         </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-3">
           <ThemeToggle />

           {user ? (
             // User is logged in
             <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden md:inline-block flex items-center gap-1">
                    <UserCircle className="h-4 w-4"/>
                    {user.email}
                </span>
               <Button variant="outline" size="sm" onClick={handleLogout} className="button">
                 <LogOut className="mr-2 h-4 w-4" />
                 Sair
               </Button>
             </div>
           ) : (
             // User is logged out - Show login/signup buttons (optional, can be removed if login is mandatory)
             <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" asChild className="button">
                 <Link href="/login">Entrar</Link>
               </Button>
               <Button size="sm" asChild className="button">
                  <Link href="/signup">Cadastrar</Link>
               </Button>
             </div>
           )}
         </div>
       </div>
     </header>
   );
 }
 