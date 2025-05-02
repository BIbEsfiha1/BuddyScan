
// src/app/(app)/layout.tsx
import React from 'react';
import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';

// This layout applies to all routes inside the (app) group
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AppHeader />
      {/* Main content for the authenticated app */}
      <main className="flex-1">{children}</main>
      <Toaster /> {/* Toaster can remain here or in RootLayout */}
    </div>
  );
}
