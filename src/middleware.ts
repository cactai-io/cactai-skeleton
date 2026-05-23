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

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
