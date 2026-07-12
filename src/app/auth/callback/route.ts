// The Sign-in-with-Cactai callback: verifies the app-side token against the
// id surface (introspection — HS256 is symmetric, so the SDK verifies
// remotely) and stores it as the session cookie. The token carries only the
// pairwise subject and profile_kind (E5) — no root id ever reaches this app.

import { NextResponse, type NextRequest } from 'next/server';
import { verifyRemote } from '@cactai-io/identity-client';
import { endpoints } from '@/lib/endpoints';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  if (token === null || token === '') {
    return NextResponse.redirect(new URL('/auth/login?error=missing_token', request.url));
  }
  const verdict = await verifyRemote(token, {
    introspectionUrl: `${endpoints.id}/introspect`,
    audience: endpoints.projectId,
  });
  if (!verdict.active) {
    return NextResponse.redirect(new URL(`/auth/login?error=${verdict.reason ?? 'inactive'}`, request.url));
  }
  const response = NextResponse.redirect(new URL('/app', request.url));
  response.cookies.set('cactai_app_token', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  return response;
}
