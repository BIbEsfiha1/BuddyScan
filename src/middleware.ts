// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Check for a cookie named 'firebaseAuthToken' (or similar)
  // This cookie should be set server-side or client-side after successful Firebase authentication
  // For simplicity, we check its existence. More robust checks might involve verifying the token.
  const authTokenCookie = request.cookies.get('firebaseAuthToken'); // Adjust cookie name if different
  const hasAuthToken = !!authTokenCookie; // Check if the cookie exists

  // Log cookie details for debugging
  console.log(`Middleware: Path: ${pathname}, Cookie 'firebaseAuthToken':`, authTokenCookie ? 'Present' : 'Absent', authTokenCookie);


  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicPath && !hasAuthToken) {
    console.log(`Middleware: No auth token cookie found, redirecting from protected route ${pathname} to /login`);
    const loginUrl = new URL('/login', request.url);
    // Optional: Pass the intended destination as a query parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup page WITH a token, redirect to dashboard
  if (isPublicPath && hasAuthToken) {
     console.log(`Middleware: Auth token cookie found, redirecting from public route ${pathname} to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to proceed if none of the above conditions are met
  console.log(`Middleware: Allowing request to ${pathname}. Public: ${isPublicPath}, HasToken: ${hasAuthToken}`);
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
// Avoid running middleware on static files and API routes
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
