// src/middleware.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// Removed import of firebaseInitializationError as it's not available/reliable in middleware edge environment
// import { auth } from './lib/firebase/config'; // Auth instance might also not be directly usable here

export function middleware(req: NextRequest) {
  // Authentication check example (if you re-enable auth):
  const requiresAuth = ['/dashboard', '/plant', '/register-plant', '/plants']; // Add protected routes
  const requiresNoAuth = ['/login', '/signup']; // Routes for non-logged-in users
  const { pathname } = req.nextUrl;

  // Use a generic cookie name, actual validation should happen server-side or via Firebase SDK on client
  const authTokenCookie = req.cookies.get('firebaseAuthToken'); // Example cookie name
  const hasAuthToken = !!authTokenCookie; // Check if the cookie exists

  if (requiresAuth.some(path => pathname.startsWith(path)) && !hasAuthToken) {
    console.log(`Middleware: No auth token, redirecting from ${pathname} to /login`);
    const loginUrl = new URL('/login', req.url);
    // loginUrl.searchParams.set('redirect', pathname); // Optional: redirect back after login
    return NextResponse.redirect(loginUrl);
  }

  if (requiresNoAuth.some(path => pathname.startsWith(path)) && hasAuthToken) {
    console.log(`Middleware: Auth token present, redirecting from ${pathname} to /dashboard`);
     return NextResponse.redirect(new URL('/dashboard', req.url));
  }


  // If no issues, continue to the requested page
  return NextResponse.next();
}

// Onde esse middleware roda (ajusta conforme suas rotas)
// Applying middleware to all routes except static assets and internal Next.js paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - buddyscan-logo.png (logo file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|buddyscan-logo.png).*)',
  ],
};
