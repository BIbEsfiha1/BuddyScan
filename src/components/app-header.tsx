// src/components/app-header.tsx
 'use client';

 import React, { useState } from 'react'; // Added useState
 import Link from 'next/link';
 import Image from 'next/image'; // Import Image component
 import ThemeToggle from '@/components/theme-toggle';
 import { Settings, Palette } from '@/components/ui/lucide-icons'; // Added Settings and Palette icon
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

 export default function AppHeader() {
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-16 items-center justify-between"> {/* Increased height */}
         {/* Logo/Brand - Use Image component */}
         <Link href="/" className="flex items-center gap-2 mr-6"> {/* Added gap */}
           {/* Use Next Image for optimization */}
           {/* Ensure budscan-logo.png exists in the /public folder */}
           <Image
               src="/budscan-logo.png" // Path to the logo in the public folder
               alt="BudScan Logo"
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
         </div>
       </div>
     </header>
   );
 }
