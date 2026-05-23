// src/lib/supabase.ts
// Supabase client instantiation.
// Two environments are wired: production (main branch) and dev (dev branch/preview).
// The correct environment is selected automatically based on NEXT_PUBLIC_APP_URL
// vs the current deployment URL, or by reading VERCEL_ENV at build time.
//
// Server-side: use createServerClient() with the service key for privileged ops.
// Client-side: use createBrowserClient() with the anon key.
//
// Never import the service key into client components — only server components and
// API routes should call createServerClient().

import { endpoints } from './endpoints';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// Detect whether this deployment is the dev/preview environment.
// On Vercel, NEXT_PUBLIC_SUPABASE_URL is overridden per environment during provisioning
// so no runtime branching is needed — the correct URL is baked in at build time.

const SUPABASE_URL     = endpoints.supabaseUrl;
const SUPABASE_ANON    = endpoints.supabaseAnonKey;

// Browser client — used in client components.
// Call once per component tree; safe to call multiple times (returns singleton).
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON);
}

// Type-safe Supabase Database stub — replaced by the agent when schema is defined.
// The agent writes the real type definitions to this file after running migrations.
export type { Database } from './database.types';
