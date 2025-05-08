// src/middleware.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Removed firebase config import as it's not needed for auth check here

export function middleware(req: NextRequest) {
  // --- Authentication checks removed from middleware ---
  // Client-side routing and AuthProvider will handle redirects based on auth state.

  const { pathname } = req.nextUrl;
  console.log(`Middleware: Processing path ${pathname}`);

  // Future middleware logic (e.g., internationalization, feature flags) can go here.

  // If no redirects or modifications are needed, continue.
  return NextResponse.next();
}

// Keep the matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - buddyscan-logo.png (logo file)
     * - public assets directly under /public that don't need auth (adjust regex if needed)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|buddyscan-logo.png).*)',
  ],
};