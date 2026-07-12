// Route guard: the signed-in region requires the app-side session cookie
// (Sign in with Cactai). Verification happens in the callback route and on
// server reads; this middleware only gates navigation.

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('cactai_app_token');
  if (!hasSession && (request.nextUrl.pathname.startsWith('/app') || request.nextUrl.pathname.startsWith('/manage'))) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/manage/:path*'],
};
