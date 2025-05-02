
// src/app/(auth)/layout.tsx
import React from 'react';

// This layout applies to all routes inside the (auth) group
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Simple div, no header or complex structure needed for auth pages
    <div className="min-h-screen">
      {children}
    </div>
  );
}
