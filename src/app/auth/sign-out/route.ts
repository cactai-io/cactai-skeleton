// Sign out: clear the app-side session cookie.

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL('/auth/login', request.url));
  response.cookies.delete('cactai_app_token');
  return response;
}
