// src/middleware.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// Server-side check for config is less direct. We might infer issues if server-side functions fail.
// import { getServerFirebaseApp } from '@/lib/firebase/server'; // Use server config if needed

export function middleware(req: NextRequest) {
  // Middleware runs on the edge/server, direct access to client-side 'firebaseInitializationError' is not possible.
  // We can check for critical env vars needed by the server config if necessary.
  // try {
  //   getServerFirebaseApp(); // Call this to check server config if needed
  // } catch (error) {
  //   console.error("Middleware: Firebase server configuration error:", error);
  //   return new NextResponse('Erro interno do servidor. Falha na configuração.', { status: 500 });
  // }


  // Authentication check example:
  const requiresAuth = ['/dashboard', '/plant', '/register-plant', '/plants']; // Add protected routes
  const requiresNoAuth = ['/login', '/signup']; // Routes for non-logged-in users
  const { pathname } = req.nextUrl;

  // --- AUTH CHECK ---
  // IMPORTANT: Middleware runs on the edge/server. It cannot directly access client-side Firebase Auth state.
  // The most reliable way is to check for a session cookie set upon successful login.
  // The specific cookie name depends on your auth implementation (Firebase often uses session cookies managed server-side
  // or custom tokens stored in cookies). Let's assume a generic cookie name for now.
  const sessionCookie = req.cookies.get('__session'); // Example name - ADJUST based on your actual session cookie!

  const hasAuthSession = !!sessionCookie; // Check if the cookie exists

  console.log(`Middleware Check: Path=${pathname}, HasAuthSession=${hasAuthSession}`);


  if (requiresAuth.some(path => pathname.startsWith(path)) && !hasAuthSession) {
    console.log(`Middleware: No auth session, redirecting from ${pathname} to /login`);
    const loginUrl = new URL('/login', req.url);
    // loginUrl.searchParams.set('redirect', pathname); // Optional: redirect back after login
    return NextResponse.redirect(loginUrl);
  }

  if (requiresNoAuth.some(path => pathname.startsWith(path)) && hasAuthSession) {
    console.log(`Middleware: Auth session present, redirecting from ${pathname} to /dashboard`);
     return NextResponse.redirect(new URL('/dashboard', req.url));
  }


  // If no issues, continue to the requested page
  return NextResponse.next();
}

// Where this middleware runs
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
