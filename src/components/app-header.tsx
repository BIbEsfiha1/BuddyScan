// src/components/app-header.tsx
 'use client';

 import React from 'react';
 import Link from 'next/link';
 import Image from 'next/image'; // Import Image component
 import ThemeToggle from '@/components/theme-toggle';
 import { Settings } from '@/components/ui/lucide-icons'; // Added settings icon
 import { Button } from '@/components/ui/button'; // Added Button for settings


 export default function AppHeader() {

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
               className="h-8 md:h-10 w-auto dark:invert-[0.15]" // Invert slightly in dark mode if needed
           />
           {/* Optional: Keep text if logo is too small */}
           {/* <span className="text-lg font-bold text-primary tracking-tight hidden sm:inline-block">BudScan</span> */}
         </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-2"> {/* Reduced gap slightly */}
           {/* Add Settings button */}
           <Button variant="ghost" size="icon" className="button" aria-label="Configurações">
             <Settings className="h-5 w-5" />
           </Button>
           <ThemeToggle />
         </div>
       </div>
     </header>
   );
 }
