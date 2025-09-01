import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

function verifyToken(token: string) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/login'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Check role-based access for approvals route
  if (pathname.startsWith('/approvals')) {
    const allowedRoles = ['PM', 'FM', 'ADMIN'];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-name', payload.name);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
