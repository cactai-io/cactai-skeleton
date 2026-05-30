// src/app/api/cactai/[...path]/route.ts
//
// Server-side proxy for browser-direct DevShell calls to the Cactai platform.
//
// Why this exists: the DevShell client (CactaiClient from @cactai-io/client)
// makes browser-direct POSTs to /v1/shell/{sessions,turn,event} and
// /v1/skills/regenerate. On a customer's Vercel preview deploy:
//   - The browser origin is *.vercel.app, not dashboard.cactai.io
//   - The platform's /v1/shell/* CORS only sets Access-Control-Allow-
//     Credentials=true for the dashboard origin, so credentials:'include'
//     fails preflight from any other origin
//   - Without credentials, /v1/shell/* needs Bearer auth — and exposing
//     CACTAI_API_KEY to the browser would leak the project-wide secret
//
// Solution: same-origin proxy. DevShell is mounted with
// cactaiBase='/api/cactai', so CactaiClient calls land here at
// /api/cactai/v1/shell/sessions, etc. We attach the project's Bearer
// token server-side (CACTAI_API_KEY stays out of the browser bundle)
// and forward to the real platform endpoint.
//
// Auth: gated on dev/collaborator role so only the authenticated
// developer who passed the DevShell handoff can use the proxy.
//
// Streaming: forwards the response body as-is, including ReadableStream
// for SSE responses that the platform may use for partial-tree streaming.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';

async function forward(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<Response> {
  // Production hard-gate. /dev itself is 404 in production, and DevShell
  // never mounts there; this is defense in depth so even a manually-crafted
  // request can't reach the proxy on a prod deploy.
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  // requireDevRole calls requireAuth which redirects to /auth/login if
  // there's no session. Inside a JSON API route we don't want the redirect
  // — but the redirect throws (Next.js convention), which propagates out
  // as a 307. CactaiClient surfaces this as a non-200 and the shell errors.
  // That's fine — it's the right failure mode when an unauthenticated
  // caller tries to use the proxy.
  await requireDevRole();

  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: 'missing_path' }, { status: 400 });
  }

  // Forward the request body verbatim. Method is preserved.
  const targetUrl = `${endpoints.cactaiBase.replace(/\/$/, '')}/${path.join('/')}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
      'Authorization': `Bearer ${endpoints.cactaiApiKey}`,
    },
    // Stream the body through for POST/PUT/PATCH; GET/DELETE have no body.
    body: req.method === 'GET' || req.method === 'DELETE' ? undefined : await req.text(),
    cache: 'no-store',
  };

  const upstream = await fetch(targetUrl, init);

  // Pass through the response, preserving status and the few headers
  // the shell may care about. Drop hop-by-hop and CORS headers — this
  // response is same-origin to the browser, no CORS needed.
  const respHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) respHeaders.set('content-type', ct);
  const cl = upstream.headers.get('content-length');
  if (cl) respHeaders.set('content-length', cl);

  return new NextResponse(upstream.body, {
    status:  upstream.status,
    headers: respHeaders,
  });
}

export async function GET   (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function POST  (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function PUT   (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function PATCH (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
