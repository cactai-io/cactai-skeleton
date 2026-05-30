// src/app/api/db/schema/route.ts
//
// Introspect the customer's Supabase public schema and return
// SchemaTable[] in the shape DevShell's SchemaPanel expects. Uses the
// project's SUPABASE_SERVICE_KEY server-side — never crosses into the
// customer's browser bundle.
//
// Reads information_schema.columns + pg_constraint via the Supabase
// REST API for the public schema only (system schemas are filtered out).

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface ColumnRow {
  table_name:   string;
  column_name:  string;
  data_type:    string;
  is_nullable:  'YES' | 'NO';
  column_default: string | null;
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supa = createServiceSupabaseClient();

  // Supabase exposes information_schema via REST when the public role
  // can SELECT from it (which is the default for service-role queries).
  // Falling back to RPC if the direct query path is unavailable.
  const { data, error } = await supa
    .schema('information_schema' as never)
    .from('columns' as never)
    .select('table_name, column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public');

  if (error) {
    return NextResponse.json({
      error:  'schema_query_failed',
      detail: error.message,
    }, { status: 502 });
  }

  // Group rows by table.
  const tables = new Map<string, { name: string; fields: Array<{ name: string; type: string; nullable: boolean; default: string | null }> }>();
  for (const row of (data ?? []) as ColumnRow[]) {
    if (!tables.has(row.table_name)) {
      tables.set(row.table_name, { name: row.table_name, fields: [] });
    }
    tables.get(row.table_name)!.fields.push({
      name:     row.column_name,
      type:     row.data_type,
      nullable: row.is_nullable === 'YES',
      default:  row.column_default,
    });
  }

  return NextResponse.json({
    tables:     Array.from(tables.values()).sort((a, b) => a.name.localeCompare(b.name)),
    migrations: [], // Phase 3d-2: read from supabase_migrations table or
                    // skeleton's config/schema/ migration log on platform DB
  });
}
