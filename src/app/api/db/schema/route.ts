// src/app/api/db/schema/route.ts
//
// Introspect the customer's Supabase Postgres directly and return the
// shape DevShell's SchemaPanel expects:
//   {
//     tables:               SchemaTable[],
//     migrations:           MigrationRecord[],
//     supabase_project_url: string,
//   }
//
// Why direct pg, not supabase-js: Supabase REST only exposes schemas
// listed in db.exposed_schemas (default: public). information_schema
// and pg_catalog are NOT exposed, so the prior REST-based attempt at
// supa.schema('information_schema').from('columns') returned an empty
// set in every customer deploy. The direct pg path uses
// SUPABASE_DATABASE_URL (the postgresql:// DSN set by the wizard) to
// run real introspection queries.
//
// Auth: dev/collaborator gate + production hard-404 (same as every
// other /api/* DevShell-data route). The DSN never reaches the
// browser; the connection is server-only.

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

interface SchemaField {
  name:     string;
  type:     string;
  nullable: boolean;
  primary?: boolean;
  default?: string;
}

interface SchemaTable {
  name:        string;
  rls_enabled: boolean;
  row_count?:  number;
  fields:      SchemaField[];
}

interface MigrationRecord {
  id:         string;
  name:       string;
  status:     'applied' | 'pending' | 'failed';
  applied_at: string;
}

// Module-scoped pool so cold start pays the connection cost once per
// Lambda. PGSSL=require because Supabase enforces TLS on the pooler.
let pool: Pool | null = null;
function getPool(): Pool | null {
  if (pool) return pool;
  const dsn = process.env.SUPABASE_DATABASE_URL;
  if (!dsn) return null;
  pool = new Pool({
    connectionString: dsn,
    ssl:              { rejectUnauthorized: false },
    max:              3,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

// Build the Supabase dashboard URL for the project from the REST URL
// (https://<ref>.supabase.co → https://supabase.com/dashboard/project/<ref>).
function supabaseProjectUrlFromRest(): string | undefined {
  const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!restUrl) return undefined;
  const match = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(restUrl);
  if (!match || !match[1]) return undefined;
  return `https://supabase.com/dashboard/project/${match[1]}`;
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const p = getPool();
  if (!p) {
    return NextResponse.json({
      error:  'database_not_configured',
      detail: 'SUPABASE_DATABASE_URL env var is missing. The wizard sets this at provision time; if absent the customer was provisioned outside the wizard flow.',
    }, { status: 412 });
  }

  try {
    // 1. Tables in public schema + RLS state + approximate row count.
    //    pg_class.reltuples is an estimate maintained by ANALYZE; the
    //    SchemaPanel labels it "rows" — close enough for a dev tool.
    const tablesRes = await p.query<{
      name:        string;
      rls_enabled: boolean;
      row_count:   number | null;
    }>(
      `SELECT c.relname            AS name,
              c.relrowsecurity     AS rls_enabled,
              c.reltuples::bigint  AS row_count
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
        ORDER BY c.relname`,
    );

    // 2. Columns for all those tables in one round-trip.
    const colsRes = await p.query<{
      table_name:     string;
      column_name:    string;
      data_type:      string;
      is_nullable:    'YES' | 'NO';
      column_default: string | null;
    }>(
      `SELECT table_name, column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`,
    );

    // 3. Primary key columns per table. pg_constraint.conkey is an
    //    int2[] of column ordinal positions; join back through
    //    information_schema.columns to get names.
    const pkRes = await p.query<{ table_name: string; column_name: string }>(
      `SELECT cls.relname  AS table_name,
              att.attname AS column_name
         FROM pg_constraint con
         JOIN pg_class cls       ON cls.oid       = con.conrelid
         JOIN pg_namespace nsp   ON nsp.oid       = cls.relnamespace
         JOIN pg_attribute att   ON att.attrelid  = con.conrelid
                                AND att.attnum   = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND con.contype = 'p'`,
    );
    const pkByTable = new Map<string, Set<string>>();
    for (const r of pkRes.rows) {
      if (!pkByTable.has(r.table_name)) pkByTable.set(r.table_name, new Set());
      pkByTable.get(r.table_name)!.add(r.column_name);
    }

    // Assemble.
    const fieldsByTable = new Map<string, SchemaField[]>();
    for (const r of colsRes.rows) {
      const pks = pkByTable.get(r.table_name);
      const field: SchemaField = {
        name:     r.column_name,
        type:     r.data_type,
        nullable: r.is_nullable === 'YES',
      };
      if (pks?.has(r.column_name)) field.primary = true;
      if (r.column_default != null) field.default = r.column_default;
      if (!fieldsByTable.has(r.table_name)) fieldsByTable.set(r.table_name, []);
      fieldsByTable.get(r.table_name)!.push(field);
    }
    const tables: SchemaTable[] = tablesRes.rows.map(r => ({
      name:        r.name,
      rls_enabled: r.rls_enabled,
      row_count:   r.row_count != null && r.row_count >= 0 ? Number(r.row_count) : undefined,
      fields:      fieldsByTable.get(r.name) ?? [],
    }));

    // 4. Migrations from supabase_migrations.schema_migrations. The
    //    table may not exist on every customer DB (Supabase creates it
    //    once the first migration is pushed via the CLI). When absent
    //    we return an empty list rather than 500.
    let migrations: MigrationRecord[] = [];
    try {
      const migRes = await p.query<{ version: string; name: string | null; statements: string[] | null }>(
        `SELECT version, name, statements
           FROM supabase_migrations.schema_migrations
          ORDER BY version DESC
          LIMIT 50`,
      );
      // Supabase encodes version as YYYYMMDDHHMMSS. Convert to ISO for
      // the panel's date renderer (panel calls new Date(applied_at)).
      const toIso = (v: string) => {
        const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(v);
        if (!m) return new Date().toISOString();
        return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
      };
      migrations = migRes.rows.map(r => ({
        id:         r.version,
        name:       r.name ?? r.version,
        status:     'applied',
        applied_at: toIso(r.version),
      }));
    } catch {
      // schema_migrations missing — fine. Leave migrations empty.
    }

    return NextResponse.json({
      tables,
      migrations,
      supabase_project_url: supabaseProjectUrlFromRest(),
    });
  } catch (err) {
    return NextResponse.json({
      error:  'schema_query_failed',
      detail: (err as Error).message,
    }, { status: 502 });
  }
}
