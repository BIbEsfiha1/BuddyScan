// src/components/app-header.tsx
 'use client';

 import React, { useState } from 'react'; // Added useState
 import Link from 'next/link';
 import Image from 'next/image'; // Import Image component
 import ThemeToggle from '@/components/theme-toggle';
 import { Settings, Palette, LogOut, UserCircle, Loader2 } from '@/components/ui/lucide-icons'; // Added icons
 import { Button } from '@/components/ui/button';
 import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger, // Import DialogTrigger
    DialogFooter,
 } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label'; // Import Label
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Import Dropdown
 import { useAuth } from '@/context/auth-context'; // Import useAuth hook
 import { useRouter } from 'next/navigation';
 import { useToast } from '@/hooks/use-toast';


 export default function AppHeader() {
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const { user, loading, logout } = useAuth(); // Get user, loading state, and logout function
   const router = useRouter();
   const { toast } = useToast();

   const handleLogout = async () => {
       try {
           await logout();
           toast({ title: "Logout realizado", description: "Você foi desconectado." });
           router.push('/'); // Redirect to landing page after logout
       } catch (error) {
           console.error("Logout failed:", error);
           toast({ variant: "destructive", title: "Erro no Logout", description: "Não foi possível fazer logout." });
       }
   };

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-16 items-center justify-between"> {/* Increased height */}
         {/* Logo/Brand - Use Image component */}
          <Link href="/dashboard" className="flex items-center gap-2 mr-6"> {/* Changed href to dashboard */}
            {/* Use Next Image for optimization */}
            {/* Ensure buddyscan-logo.png exists in the /public folder */}
            <Image
               src="/buddyscan-logo.png" // Path to the logo in the public folder
               alt="BuddyScan Logo" // Updated alt text
               width={140} // Adjust width as needed
               height={40} // Adjust height as needed
               priority // Load the logo quickly
               className="h-8 md:h-10 w-auto dark:invert-[0.05]" // Minimal invert in dark mode
            />
          </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-2"> {/* Reduced gap slightly */}
             {/* Settings Dialog */}
             <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
               <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="button" aria-label="Configurações">
                   <Settings className="h-5 w-5" />
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] dialog-content border-primary/20">
                 <DialogHeader>
                   <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                      <Settings className="h-6 w-6"/> Configurações
                   </DialogTitle>
                   <DialogDescription>
                     Ajuste as preferências do aplicativo aqui.
                   </DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-6 py-4"> {/* Increased gap */}
                   {/* Theme Settings */}
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border p-4 rounded-lg bg-muted/30"> {/* Added padding, background, border */}
                       <div className="flex items-center gap-2">
                         <Palette className="h-5 w-5 text-secondary"/>
                         <Label htmlFor="theme-toggle" className="text-base font-medium text-foreground"> {/* Larger font */}
                           Tema da Interface
                         </Label>
                       </div>
                       <ThemeToggle /> {/* Moved ThemeToggle here */}
                   </div>
                   {/* Add more settings sections here as needed */}
                   {/* Example:
                   <div className="flex items-center justify-between gap-4 border p-4 rounded-lg bg-muted/30">
                      <Label htmlFor="setting-2" className="text-base font-medium">Outra Configuração</Label>
                      <Switch id="setting-2" />
                   </div>
                   */}
                 </div>
                 <DialogFooter>
                   <Button type="button" variant="secondary" onClick={() => setIsSettingsOpen(false)} className="button">
                     Fechar
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>

             {/* User Avatar / Login Button */}
             {loading ? (
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
             ) : user ? (
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-9 w-9 rounded-full button p-0">
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
                         {/* <DropdownMenuItem>Perfil</DropdownMenuItem> */}
                         {/* <DropdownMenuItem>Configurações</DropdownMenuItem> */}
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                         </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
             ) : (
                 <Button asChild className="button" disabled> {/* Disable login button */}
                     {/* <Link href="/login">Login</Link> */}
                     <span>Login Desabilitado</span> {/* Show placeholder text */}
                 </Button>
             )}
         </div>
       </div>
     </header>
   );
 }
