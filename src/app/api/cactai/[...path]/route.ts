// src/app/api/cactai/[...path]/route.ts
//
// Server-side proxy for browser-direct DevShell calls to the Cactai
// platform. Same-origin so credentials:'include' works; injects the
// project's CACTAI_API_KEY Bearer so the per-project bearer secret
// never reaches the browser.
//
// v1.4 — AI provider key injection stripped per
// docs/ai-provider-architecture.md §5. Keys never travel in the request
// body. The platform resolves provider + key + selection server-side via
// resolveTurnPick using the session's developer/project/end-user context.
//
// Auth: gated on dev/collaborator role so only the authenticated
// developer who passed the DevShell handoff can use the proxy.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';

// SSE pass-through requires no buffering. Node runtime + force-dynamic
// ensures Next won't try to cache or convert the body to a fixed-length
// response. Without these, /v1/outputs/:rid/stream would buffer to EOF
// and only deliver after turn.complete — collapsing the chat stream.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// SSE turn streams hold this proxy function open for the whole agent turn.
// Vercel's default function timeout (~10s) killed it mid-turn — the model
// finished (e.g. 27k in / 1k out) but the EventSource dropped with "Stream
// connection interrupted" before the response was delivered. Raise the cap so
// the proxy survives a full turn. Vercel clamps this to the plan's max
// (Hobby ~60s, Pro up to 300s).
export const maxDuration = 300;

async function forward(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<Response> {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  // requireAuth (called by requireDevRole) throws/redirects on no-session;
  // the redirect propagates as a 307 to the proxy caller, which surfaces
  // as a non-200 to CactaiClient. That's the right failure mode for an
  // unauthenticated caller.
  await requireDevRole();

  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: 'missing_path' }, { status: 400 });
  }

  // v1.4: forward the body verbatim. No more model_api_key / provider
  // injection — the platform's resolveTurnPick handles all resolution
  // server-side from the session's project + end-user context.
  let outgoingBody: string | undefined;
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    outgoingBody = await req.text();
  }

  // Preserve the query string — guide/welcome calls carry ?surface=…&personality_name=…
  // and dropping it makes the platform fall back to the workspace guide for every request.
  const targetUrl = `${endpoints.cactaiBase.replace(/\/$/, '')}/${path.join('/')}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type':  req.headers.get('content-type') ?? 'application/json',
      'Authorization': `Bearer ${endpoints.cactaiApiKey}`,
    },
    body: outgoingBody,
    cache: 'no-store',
  };

  const upstream = await fetch(targetUrl, init);

  // Pass through preserving status. Drop CORS headers — this response is
  // same-origin to the browser, no CORS dance needed.
  const respHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) respHeaders.set('content-type', ct);

  // SSE streams (text/event-stream) must NOT carry a content-length and
  // must signal no-cache so intermediaries don't buffer to EOF before
  // releasing the body. EventSource on the browser side will close the
  // stream on the first chunk if either header is wrong.
  const isStream = (ct ?? '').toLowerCase().startsWith('text/event-stream');
  if (isStream) {
    respHeaders.set('cache-control', 'no-cache, no-transform');
    respHeaders.set('connection',    'keep-alive');
    // Vercel/Next: opt out of any proxy buffering for this response.
    respHeaders.set('x-accel-buffering', 'no');
  } else {
    const cl = upstream.headers.get('content-length');
    if (cl) respHeaders.set('content-length', cl);
  }

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
