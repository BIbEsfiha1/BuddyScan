// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No longer checking public paths or auth tokens
// const publicPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  // Allow all requests to proceed without authentication checks
  console.log(`Middleware: Allowing request to ${request.nextUrl.pathname}. Authentication disabled.`);
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
