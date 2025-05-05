 'use client';

 import React, { useState } from 'react';
 import Link from 'next/link';
 // Import Image component from Next.js
 import Image from 'next/image';
 import ThemeToggle from '@/components/theme-toggle';
 import { Settings, Palette, LogOut, UserCircle, Loader2, Home as HomeIcon } from '@/components/ui/lucide-icons'; // Added icons, including HomeIcon
 import { Button } from '@/components/ui/button';
 import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
 } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
 import { useAuth } from '@/context/auth-context'; // Re-enabled auth context
 import { useRouter } from 'next/navigation';
 import { useToast } from '@/hooks/use-toast';
 import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
 // Import Tooltip components
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Ensure TooltipProvider is imported


 export default function AppHeader() {
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const { user, loading, logout } = useAuth(); // Use auth context
   const router = useRouter();
   const { toast } = useToast();
   const isAuthEnabled = true; // Re-enable auth features

   const handleLogout = async () => {
        if (isAuthEnabled && logout) {
            try {
                await logout();
                toast({ title: "Logout realizado", description: "Você saiu da sua conta." });
                router.push('/'); // Redirect to landing page after logout
            } catch (error) {
                console.error("Logout error:", error);
                toast({ variant: "destructive", title: "Erro no Logout", description: "Não foi possível sair. Tente novamente." });
            }
        } else if (isAuthEnabled) {
           console.warn("Logout function not available in auth context.");
           toast({ title: "Logout Indisponível", description: "A funcionalidade de logout não está pronta." });
        }
   };

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-16 items-center justify-between"> {/* Increased height */}
         {/* Logo/Brand */}
          <Link href={isAuthEnabled && user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-6"> {/* Link to dashboard if logged in, else landing */}
              <Image
                 src="/buddyscan-logo.png" // Path relative to the public folder
                 alt="BuddyScan Logo"
                 width="140" // Set width directly based on logo aspect ratio (742 / 2048 * 140 ≈ 51)
                 height="51" // Set height based on aspect ratio
                 className="object-contain h-[51px]" // Use explicit height class
                 priority // Prioritize logo loading
                 onError={(e) => console.error('Standard <img> load error (Header):', (e.target as HTMLImageElement).src)}
              />
          </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-2">
             {/* Settings Dialog */}
             <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
               <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="button" aria-label="Configurações">
                   <Settings className="h-5 w-5" />
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] dialog-content border-primary/20 bg-background/95 backdrop-blur-sm">
                 <DialogHeader>
                   <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                      <Settings className="h-6 w-6"/> Configurações
                   </DialogTitle>
                   <DialogDescription>
                     Ajuste as preferências do aplicativo aqui.
                   </DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-6 py-4">
                   {/* Theme Settings */}
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border p-4 rounded-lg bg-muted/30">
                       <div className="flex items-center gap-2">
                         <Palette className="h-5 w-5 text-secondary"/>
                         <Label htmlFor="theme-toggle" className="text-base font-medium text-foreground">
                           Tema da Interface
                         </Label>
                       </div>
                       <ThemeToggle />
                   </div>
                   {/* Example Placeholder Setting */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border p-4 rounded-lg bg-muted/30 opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-2">
                            <HomeIcon className="h-5 w-5 text-secondary"/> {/* Example icon */}
                            <Label htmlFor="placeholder-setting" className="text-base font-medium text-foreground">
                                Outra Configuração (Exemplo)
                            </Label>
                        </div>
                         <span className="text-sm text-muted-foreground">Em breve</span>
                    </div>
                 </div>
                 <DialogFooter>
                   <Button type="button" variant="secondary" onClick={() => setIsSettingsOpen(false)} className="button">
                     Fechar
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>

             {/* User Avatar / Login Button - Conditionally render based on isAuthEnabled */}
             {isAuthEnabled ? (
                 <>
                 {loading ? (
                     // Skeleton loader while auth state is loading
                      <div className="flex items-center gap-2">
                         <Skeleton className="h-9 w-9 rounded-full" />
                         {/* <Skeleton className="h-4 w-20 rounded-md" /> */}
                      </div>
                 ) : user ? (
                      // User is logged in - Show dropdown
                      <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                             <Button variant="ghost" className="relative h-9 w-9 rounded-full button p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                 <Avatar className="h-9 w-9 border-2 border-primary/30">
                                     <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'Usuário'} />
                                     <AvatarFallback>
                                        {user.email ? user.email[0].toUpperCase() : <UserCircle className="h-5 w-5"/>}
                                     </AvatarFallback>
                                  </Avatar>
                             </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="w-56" align="end" forceMount>
                             <DropdownMenuLabel className="font-normal">
                                 <div className="flex flex-col space-y-1">
                                     <p className="text-sm font-medium leading-none">{user.displayName || 'Usuário'}</p>
                                     <p className="text-xs leading-none text-muted-foreground">
                                        {user.email}
                                     </p>
                                 </div>
                             </DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             {/* Add links to profile/settings pages here if needed */}
                             {/* <DropdownMenuItem onClick={() => router.push('/profile')}>
                                 <UserCircle className="mr-2 h-4 w-4" /> Perfil
                             </DropdownMenuItem> */}
                             <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer">
                                 <Settings className="mr-2 h-4 w-4" /> Configurações
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                             </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                 ) : (
                    // User is not logged in - Show Login Button
                     <Button asChild className="button">
                         <Link href="/login">Login</Link> {/* Point to login page if not logged in */}
                     </Button>
                 )}
                </>
             ) : (
              // Auth is disabled - Show placeholder
               <TooltipProvider>
                      <Tooltip>
                           <TooltipTrigger asChild>
                              {/* Wrap disabled button in span for tooltip */}
                              <span tabIndex={0} className="inline-block">
                                 <Button variant="ghost" className="relative h-9 w-9 rounded-full button p-0 focus-visible:ring-0 focus-visible:ring-offset-0 opacity-50 cursor-not-allowed" disabled>
                                    <Avatar className="h-9 w-9 border-2 border-muted">
                                        <AvatarFallback>
                                           <UserCircle className="h-5 w-5 text-muted-foreground"/>
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                              </span>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Login temporariamente desabilitado</p>
                           </TooltipContent>
                      </Tooltip>
                 </TooltipProvider>
             )}

         </div>
       </div>
     </header>
   );
 }
