
 // src/components/app-header.tsx
 'use client';

 import React from 'react';
 import Link from 'next/link';
 // import { Button } from '@/components/ui/button'; // Button might not be needed if no actions remain
 import ThemeToggle from '@/components/theme-toggle';
 // import { useAuth } from '@/context/auth-context'; // Remove useAuth import
 // import { signOut } from 'firebase/auth'; // Remove Firebase imports
 // import { auth } from '@/lib/firebase/config'; // Remove Firebase imports
 // import { useRouter } from 'next/navigation'; // Remove useRouter if not needed for logout
 // import { useToast } from '@/hooks/use-toast'; // Remove useToast if not needed for logout
 import { Sprout } from 'lucide-react'; // Keep Sprout icon // Removed LogOut, UserCircle

 export default function AppHeader() {
   // const { user, loading } = useAuth(); // Remove auth state
   // const router = useRouter(); // Remove if not needed
   // const { toast } = useToast(); // Remove if not needed

   // const handleLogout = async () => { // Remove logout handler
   //   try {
   //     await signOut(auth);
   //     toast({ title: 'Logout Realizado', description: 'Você saiu com sucesso.' });
   //     router.push('/login'); // Redirect to login after logout
   //   } catch (error) {
   //     console.error('Erro ao fazer logout:', error);
   //     toast({ variant: 'destructive', title: 'Erro no Logout', description: 'Não foi possível sair.' });
   //   }
   // };

   // No longer need loading state check
   // if (loading) {
   //   return null; // Or a minimal loading state if preferred
   // }

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
           {/* Remove all conditional rendering based on user */}
           {/* {user ? (...) : (...)} */}
         </div>
       </div>
     </header>
   );
 }
