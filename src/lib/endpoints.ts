// src/lib/endpoints.ts
//
// SINGLE SOURCE OF TRUTH for the skeleton's outbound URLs and IDs.
//
// The skeleton is a Next.js app deployed by /v1/provision to a developer's
// own Vercel project. provision.ts sets these env vars on the Vercel
// project at deploy time:
//
//   NEXT_PUBLIC_CACTAI_BASE_URL    — the Cactai platform API URL (browser)
//   CACTAI_BASE_URL                — same, server-side reads
//   NEXT_PUBLIC_CACTAI_PROJECT_ID  — this app's project id on Cactai
//   CACTAI_API_KEY                 — server-side bearer token (never in browser)
//   NEXT_PUBLIC_SUPABASE_URL       — developer's own Supabase project
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  — developer's anon key
//   SUPABASE_SERVICE_KEY           — developer's service-role key (server only)
//
// The fallback values below assume cactai.io production. Local dev usually
// sets these in .env.local pointing at localhost.
//
// HOW TO UPDATE
// -------------
// Adding a new external endpoint? Add it here, give it an env var, give
// it a fallback. See workspace-root MAINTENANCE_MAP.md for the reference
// graph across all repos.

const cactaiBase = process.env.NEXT_PUBLIC_CACTAI_BASE_URL
                ?? process.env.CACTAI_BASE_URL
                ?? 'https://api.cactai.io';

const projectId = process.env.NEXT_PUBLIC_CACTAI_PROJECT_ID;
if (!projectId) {
  // Hard-fail at module load. If this fires in a deployed app, /v1/provision
  // either didn't run or failed silently while setting Vercel env vars. The
  // app cannot function without a real project id — sessions, turns, and
  // events all key off it on the platform side. Failing here surfaces the
  // misconfiguration immediately instead of silently sending API calls
  // tagged with a fallback value the platform will reject.
  //
  // To unblock: re-run /v1/provision on the platform side, or set
  // NEXT_PUBLIC_CACTAI_PROJECT_ID manually in the Vercel project's env vars
  // to the project's real UUID.
  throw new Error(
    'Configuration error: NEXT_PUBLIC_CACTAI_PROJECT_ID is not set. ' +
    'The skeleton cannot start without a project id. Run /v1/provision ' +
    'on the platform or set this env var manually in the Vercel project.',
  );
}

export const endpoints = {
  /** Cactai platform API URL. Both client- and server-readable. */
  cactaiBase,

  /** This app's project id on Cactai. Set during /v1/provision. Required. */
  projectId,

  /** Cactai API key (server-only — never expose to the browser). */
  cactaiApiKey: process.env.CACTAI_API_KEY ?? '',

  /** Supabase project (developer's own, not Cactai's). */
  supabaseUrl:        process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '',
  supabaseAnonKey:    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY          ?? '',
} as const;

export type Endpoints = typeof endpoints;
