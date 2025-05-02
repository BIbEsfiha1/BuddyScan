
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('firebaseAuthToken'); // Example: Use a cookie set on login

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicPath && !authToken) {
    console.log(`Middleware: No token, redirecting from protected route ${pathname} to /login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname); // Optional: add redirect query param
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup page with a token, redirect to dashboard
  if (isPublicPath && authToken) {
     console.log(`Middleware: Has token, redirecting from public route ${pathname} to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to proceed
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
