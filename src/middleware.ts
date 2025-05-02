
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase/auth';
import { firebaseInitializationError } from './lib/firebase/config'; // Import error state

// List of routes that are considered part of the main application
// and require authentication.
const appRoutes = ['/dashboard', '/plants', '/plant', '/register-plant'];

// Function to check if a path starts with any of the app route prefixes
function isAppRoute(pathname: string): boolean {
    return appRoutes.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authTokenCookie = request.cookies.get('firebaseAuthToken'); // Example cookie name

  console.log(`Middleware: Pathname: ${pathname}, Auth Token Present: ${!!authTokenCookie}`);

  // Allow access to the landing page (root) and auth pages regardless of auth state
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    console.log(`Middleware: Allowing public route: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the requested path is an application route
  if (isAppRoute(pathname)) {
    // If trying to access an app route without an auth token, redirect to landing page
    if (!authTokenCookie) {
      console.log(`Middleware: No auth token found for app route ${pathname}. Redirecting to landing page.`);
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Redirect to landing page
      url.search = ''; // Clear query params if any
      return NextResponse.redirect(url);
    }

    // If auth token exists, allow access (further validation would happen client-side)
    console.log(`Middleware: Auth token found for app route ${pathname}. Allowing access.`);
    return NextResponse.next();
  }

  // For any other paths not explicitly handled, allow access
  console.log(`Middleware: Path ${pathname} is not an app route. Allowing access.`);
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
// Keep the matcher configuration to avoid running on static assets etc.
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
