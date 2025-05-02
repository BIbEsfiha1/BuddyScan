
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
  const authTokenCookie = request.cookies.get('firebaseAuthToken'); // Example cookie name

  console.log(`Middleware: Pathname: ${pathname}, Auth Token Present: ${!!authTokenCookie}`);

  // ** Temporary Change: Allow access even if auth token is missing, since login is disabled **
  const isLoginEnabled = false; // Set this to true when login is re-enabled

   // Block access if Firebase itself failed critically
   if (firebaseInitializationError) {
       console.error("Middleware: Blocking access due to Firebase initialization error.");
       // Optional: Redirect to an error page or show a simple message
       // For now, let's just prevent further processing by returning early or redirecting to landing
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
    if (!authTokenCookie && isLoginEnabled) { // Check if login is enabled
      console.log(`Middleware: No auth token found for app route ${pathname} and login is enabled. Redirecting to landing page.`);
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Redirect to landing page
      url.search = ''; // Clear query params if any
      return NextResponse.redirect(url);
    }

    // If auth token exists OR login is disabled, allow access
    console.log(`Middleware: Auth token found or login disabled for app route ${pathname}. Allowing access.`);
    return NextResponse.next();
  }

  // For any other paths not explicitly handled, allow access
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
