
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Import firebaseInitializationError to potentially block if Firebase is totally broken
import { firebaseInitializationError } from './lib/firebase/config';

// List of routes that are considered part of the main application
// and potentially require authentication (when enabled).
const appRoutes = ['/dashboard', '/plants', '/plant', '/register-plant'];

// Function to check if a path starts with any of the app route prefixes
function isAppRoute(pathname: string): boolean {
    return appRoutes.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Consider using a more secure method like checking a server-validated session
  // For now, relying on a simple cookie check as an example
  const authTokenCookie = request.cookies.get('firebaseAuthToken'); // Example cookie name

  console.log(`Middleware: Pathname: ${pathname}, Auth Token Present: ${!!authTokenCookie}`);

  const isLoginEnabled = true; // Re-enable login checks

   // Block access if Firebase itself failed critically
   if (firebaseInitializationError) {
       console.error("Middleware: Blocking access due to Firebase initialization error.");
       // Redirect to landing page if Firebase init failed
       if (pathname !== '/') {
            const url = request.nextUrl.clone();
            url.pathname = '/'; // Redirect to landing page
            url.search = '?error=firebase_init_failed'; // Optional query param
            return NextResponse.redirect(url);
       }
   }

  // Allow access to the landing page (root) and auth pages (login/signup) regardless of auth state
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    console.log(`Middleware: Allowing public/auth route: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the requested path is an application route
  if (isAppRoute(pathname)) {
    // If trying to access an app route without an auth token AND login is enabled, redirect.
    if (!authTokenCookie && isLoginEnabled) {
      console.log(`Middleware: No auth token found for app route ${pathname} and login is enabled. Redirecting to login page.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login'; // Redirect to login page
      url.searchParams.set('redirectedFrom', pathname); // Optionally pass original path
      return NextResponse.redirect(url);
    }

    // If auth token exists OR login is disabled (which it isn't anymore), allow access
    console.log(`Middleware: Auth token found for app route ${pathname}. Allowing access.`);
    return NextResponse.next();
  }

  // For any other paths not explicitly handled, allow access
  // Consider if other paths should also be protected
  console.log(`Middleware: Path ${pathname} is not an app route. Allowing access.`);
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any files with extensions (e.g., .png, .jpg) to avoid unnecessary checks
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+).*)',
  ],
};
