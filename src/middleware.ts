// src/middleware.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firebaseInitializationError } from './lib/firebase/config'; // Auth is not needed here directly

export function middleware(req: NextRequest) {
  // Se o Firebase não inicializou, bota 500
  if (firebaseInitializationError) {
     console.error("Middleware: Firebase Initialization Error Detected.", firebaseInitializationError);
    // Return a more user-friendly error page or response
    // For simplicity, returning a plain text response here.
    // In a real app, you might redirect to an error page.
    return new NextResponse(
      `🚨 Erro na Configuração do Servidor: ${firebaseInitializationError.message}. Por favor, contate o suporte.`,
      { status: 500 }
    );
  }

  // Authentication check example (if you re-enable auth):
  // const requiresAuth = ['/dashboard', '/plant', '/register-plant', '/plants']; // Add protected routes
  // const requiresNoAuth = ['/login', '/signup']; // Routes for non-logged-in users
  // const { pathname } = req.nextUrl;
  // const authToken = req.cookies.get('firebaseAuthToken')?.value; // Example cookie name

  // if (requiresAuth.some(path => pathname.startsWith(path)) && !authToken) {
  //   console.log(`Middleware: No auth token, redirecting from ${pathname} to /login`);
  //   return NextResponse.redirect(new URL('/login', req.url));
  // }

  // if (requiresNoAuth.some(path => pathname.startsWith(path)) && authToken) {
  //   console.log(`Middleware: Auth token present, redirecting from ${pathname} to /dashboard`);
  //    return NextResponse.redirect(new URL('/dashboard', req.url));
  // }


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
