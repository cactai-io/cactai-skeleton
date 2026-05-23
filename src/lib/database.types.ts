// src/lib/database.types.ts
// Supabase database type definitions.
// This file is a stub — the agent replaces it after running schema migrations
// during workflow Stage 5. Do not edit manually; it will be overwritten.
//
// After the agent generates the schema, this file will contain fully typed
// table definitions generated from the Supabase schema via the Supabase CLI
// or Management API introspection.
//
// Until then, the typed shape is intentionally permissive so route handlers
// referencing yet-to-be-generated tables still type-check. supabase-js 2.45+
// resolves unknown tables to `never` when given a strict schema, which would
// make every .from('app_users')... call fail at compile time before the
// schema is generated. We use a loose schema here to avoid that.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Loose schema — replaced after schema generation by the workflow agent.
// Intentionally typed as `any` so supabase-js infers reasonable types for
// any table name. After the agent runs, this entire file is overwritten.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
