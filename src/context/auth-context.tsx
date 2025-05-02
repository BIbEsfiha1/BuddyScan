 // src/components/app-header.tsx
 'use client';

 import React from 'react';
 import Link from 'next/link';
 import Image from 'next/image'; // Import Image component
 import ThemeToggle from '@/components/theme-toggle';
 // Removed Sprout icon as we're using an image logo now
 // import { Sprout } from 'lucide-react';
 // Remove user-related imports
 // import { Button } from '@/components/ui/button';
 // import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 // import { LogIn, UserPlus, LogOut } from 'lucide-react';
 // import { useAuth } from '@/context/auth-context';
 // import {
 //   DropdownMenu,
 //   DropdownMenuContent,
 //   DropdownMenuItem,
 //   DropdownMenuLabel,
 //   DropdownMenuSeparator,
 //   DropdownMenuTrigger,
 // } from '@/components/ui/dropdown-menu';


 export default function AppHeader() {
   // Remove auth context usage
   // const { user, loading, logout } = useAuth();

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-16 items-center justify-between"> {/* Increased height for logo */}
         {/* Logo/Brand - Use Image component */}
         <Link href="/" className="flex items-center mr-6">
           {/* Use Next Image for optimization */}
           {/* Ensure budscan-logo.png exists in the /public folder */}
           <Image
               src="/budscan-logo.png" // Path to the logo in the public folder - CONFIRMED PATH USAGE
               alt="BudScan Logo"
               width={140} // Adjust width as needed
               height={40} // Adjust height as needed
               priority // Load the logo quickly
               className="h-8 md:h-10 w-auto" // Responsive height
           />
           {/* Remove text span */}
           {/* <Sprout className="h-6 w-6 text-primary" />
           <span className="font-bold text-primary tracking-tight hidden sm:inline-block">CannaLog</span> */}
         </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-3">
           <ThemeToggle />
           {/* Remove all conditional rendering based on user */}
         </div>
       </div>
     </header>
   );
 }

```
    </content>
  </change>
  <change>
    <file>src/context/auth-context.tsx</file>
    <description>Remove AuthProvider component and related logic as login is disabled.</description>
    <