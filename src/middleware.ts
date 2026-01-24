import { NextResponse, type NextRequest } from 'next/server';

// This is a simplified middleware. Real production would use firebase-admin to verify session cookie.
// Since we are using client-side Firebase, we will keep the redirection logic in layouts
// but can add a basic matcher here for clarity.

export function middleware(request: NextRequest) {
  // const authCookie = request.cookies.get('__session'); // Requires Firebase session cookie setup

  // For now, we rely on Layout-level protection which is better for client-side Firebase Auth.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/wallet/:path*', '/tasks/:path*', '/profile/:path*'],
};
