// src/middleware.ts
// Next.js middleware. Two responsibilities:
//   1. Refresh the Supabase session cookie on every request.
//   2. Propagate the X-Cactai-Lens header into a request-scoped header
//      that server components and route handlers read. This is how
//      per-tab lens overrides reach RLS-scoped queries.
//
// The header value is NOT validated here; validation happens at
// supabase.server.ts setLensSetting() which checks the user's actual
// tenant_members rows before applying.

import { endpoints } from '@/lib/endpoints';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const VALID_LENS_PATTERN = /^[a-zA-Z0-9_]{1,32}$/;

export async function middleware(request: NextRequest) {
  // Forward the lens header into a request-scoped header so downstream
  // server code can pick it up via headers().get('x-cactai-lens').
  // We strip any value that doesn't match the safe pattern.
  let response = NextResponse.next({ request });
  const lensIn = request.headers.get('x-cactai-lens');
  if (lensIn && VALID_LENS_PATTERN.test(lensIn)) {
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('x-cactai-lens', lensIn);
    response = NextResponse.next({ request: { headers: reqHeaders } });
  }

  const supabase = createServerClient(
    endpoints.supabaseUrl,
    endpoints.supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // On Vercel preview deployments only (the dev-branch deploys the wizard
  // captures into projects.preview_url), bounce unauthenticated navigation
  // back to the platform so the developer lands in DevShell instead of the
  // public app's sign-in. Paths that would interrupt the handoff itself
  // (the inbound /api/preview-auth carrying the token, /auth/* callbacks
  // that finish OAuth, and Next internals) are exempt. Production deploys
  // (VERCEL_ENV='production') keep their normal sign-in flow — end users
  // land on /, log in, and bootstrap claims tenant ownership the first
  // time.
  if (process.env.VERCEL_ENV === 'preview' && !user) {
    const path = request.nextUrl.pathname;
    const isExempt =
      path.startsWith('/api/preview-auth') ||
      path.startsWith('/auth') ||
      path.startsWith('/api/auth') ||
      path === '/favicon.ico';
    if (!isExempt) {
      const dashboardBounce =
        `${endpoints.cactaiBase.replace(/\/$/, '')}/v1/projects/${endpoints.projectId}/devshell-redirect`;
      return NextResponse.redirect(dashboardBounce, 302);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
