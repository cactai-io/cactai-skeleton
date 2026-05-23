// src/test-utils/supabase-mock.ts
// Hand-rolled Supabase client mock for tests. The skeleton's auth/callback
// route uses two flavors of client:
//   - createServerClient (from @supabase/ssr) — the user-facing session
//     client that exchangeCodeForSession runs on. Tests fake its
//     auth.exchangeCodeForSession and auth.getUser methods.
//   - createServiceSupabaseClient — the service-role admin client that
//     reads project_state, app_users, tenant_members, tenant_invitations,
//     and tenants. Tests fake its query builder ergonomics enough to drive
//     the bootstrap logic.
//
// The mock is intentionally minimal: it implements only the chains the
// callback route actually uses (select/insert/update/upsert with eq/is/gte/
// order/limit/maybeSingle/single combinators). Anything outside those chains
// throws an explicit error so a test that exercises an unmocked code path
// fails loudly instead of returning silent garbage.

import { vi } from 'vitest';

export type QueryResponse = {
  data:  unknown;
  error: { message: string } | null;
};

// Description of one expected query against a table. Tests stack these per
// table; each builder operation pops the next matching response when its
// terminal (maybeSingle, single, or implicit await) fires.
export interface MockedCall {
  /** Optional sanity assertion: which operation should produce this row.
   *  Pure documentation in test failures; not used for routing. */
  op?:   'select' | 'insert' | 'update' | 'upsert' | 'delete';
  data:  unknown;
  error?: { message: string } | null;
}

// Per-test table configuration. Maps table name → ordered queue of responses
// to return for each call against that table.
export type TableConfig = Record<string, MockedCall[]>;

interface CapturedInsert {
  table:   string;
  payload: unknown;
}

export interface MockServiceClient {
  from: (table: string) => QueryBuilder;
  // Test introspection — what got written, in order.
  inserts: CapturedInsert[];
  updates: Array<{ table: string; payload: unknown; eq?: Record<string, unknown> }>;
  upserts: Array<{ table: string; payload: unknown }>;
}

interface QueryBuilder {
  select:      (cols?: string) => QueryBuilder;
  insert:      (payload: unknown) => Promise<QueryResponse> & QueryBuilder;
  update:      (payload: unknown) => QueryBuilder;
  upsert:      (payload: unknown, opts?: { onConflict?: string }) => Promise<QueryResponse>;
  delete:      () => QueryBuilder;
  eq:          (col: string, val: unknown) => QueryBuilder;
  is:          (col: string, val: unknown) => QueryBuilder;
  gte:         (col: string, val: unknown) => QueryBuilder;
  order:       (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit:       (n: number) => QueryBuilder;
  maybeSingle: () => Promise<QueryResponse>;
  single:      () => Promise<QueryResponse>;
  then:        Promise<QueryResponse>['then'];
}

// Build a mock service-role Supabase client from a table-config map.
// Each table's MockedCall[] is consumed in FIFO order — the first call
// against `tableX` pops `tableX[0]`, the second pops `tableX[1]`, etc.
export function buildServiceClient(config: TableConfig): MockServiceClient {
  const remaining: TableConfig = {};
  for (const [table, calls] of Object.entries(config)) {
    remaining[table] = [...calls];
  }

  const captured = {
    inserts: [] as CapturedInsert[],
    updates: [] as Array<{ table: string; payload: unknown; eq?: Record<string, unknown> }>,
    upserts: [] as Array<{ table: string; payload: unknown }>,
  };

  function popNext(table: string): MockedCall {
    const queue = remaining[table];
    if (!queue || queue.length === 0) {
      throw new Error(`[mock-supabase] no more responses queued for table=${table}`);
    }
    return queue.shift()!;
  }

  function makeBuilder(table: string): QueryBuilder {
    // Terminal-aware: the builder is itself thenable so callers that don't
    // chain .maybeSingle()/.single() (e.g. plain `.select(...).eq(...)`)
    // still resolve into the next queued response.
    const builder: QueryBuilder = {
      select: () => builder,
      insert: (payload: unknown) => {
        captured.inserts.push({ table, payload });
        const next = popNext(table);
        // insert returns a thenable that can be chained .select().single()
        // OR awaited directly. We hand back a "dual-purpose" object: a
        // Promise of QueryResponse that also has the builder methods.
        const response: QueryResponse = { data: next.data, error: next.error ?? null };
        return Object.assign(Promise.resolve(response), builder) as Promise<QueryResponse> & QueryBuilder;
      },
      update: (payload: unknown) => {
        captured.updates.push({ table, payload });
        return builder;
      },
      upsert: async (payload: unknown) => {
        captured.upserts.push({ table, payload });
        const next = popNext(table);
        return { data: next.data, error: next.error ?? null };
      },
      delete: () => builder,
      eq:    () => builder,
      is:    () => builder,
      gte:   () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        const next = popNext(table);
        return { data: next.data, error: next.error ?? null };
      },
      single: async () => {
        const next = popNext(table);
        return { data: next.data, error: next.error ?? null };
      },
      // Awaiting the chain directly (e.g. `await admin.from('x').select().eq().limit()`)
      // pulls the next response too. This covers .select().eq() chains
      // that don't terminate with .maybeSingle/.single.
      then: ((resolve: unknown, reject: unknown) => {
        try {
          const next = popNext(table);
          const value = { data: next.data, error: next.error ?? null };
          return Promise.resolve(value).then(resolve as never, reject as never);
        } catch (err) {
          return Promise.reject(err).then(resolve as never, reject as never);
        }
      }) as QueryBuilder['then'],
    };
    return builder;
  }

  return {
    from: makeBuilder,
    inserts: captured.inserts,
    updates: captured.updates,
    upserts: captured.upserts,
  };
}

// Helpers for building common project_state.decisions blobs used across
// tests. Keeps individual test cases shorter and prevents typos in the
// signup_mode_v1 key.
export function decisionsWithMode(mode: string): { decisions: Record<string, unknown> } {
  return { decisions: { signup_mode_v1: mode } };
}

// Convenience: build a server-client mock for @supabase/ssr's
// createServerClient. The callback route uses three methods on it:
//   - auth.exchangeCodeForSession(code)
//   - auth.getUser()
//   - auth.signOut()
export interface ServerClientMockOpts {
  exchangeError?: string | null;
  user?:          { id: string; email: string } | null;
}

export function buildServerClient(opts: ServerClientMockOpts) {
  const signOut = vi.fn(async () => ({ error: null }));
  return {
    signOut,
    client: {
      auth: {
        exchangeCodeForSession: vi.fn(async () => ({
          error: opts.exchangeError ? { message: opts.exchangeError } : null,
        })),
        getUser: vi.fn(async () => ({
          data:  { user: opts.user ?? null },
          error: null,
        })),
        signOut,
      },
    },
  };
}
