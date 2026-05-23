// src/app/auth/callback/route.test.ts
// Full matrix tests for the auth/callback bootstrap flow. Covers:
//
//   Top-level (no signup_mode-specific):
//     • missing code → callback_failed redirect
//     • exchangeCodeForSession error → callback_failed redirect
//     • getUser returns null → callback_failed redirect
//     • user already bootstrapped → skips bootstrap, redirects via getPostLoginRedirect
//
//   Invitation path (any signup_mode):
//     • valid invitation accepted → app_users + tenant_members + invitation update
//     • expired invitation present + open mode → falls through to signup_mode
//     • invitation insert fails (e.g. duplicate app_users row) → bootstrap_failed
//
//   single_user_shared:
//     • happy path → user row on the default tenant with role=user
//     • default tenant missing → bootstrap_failed
//
//   single_user_isolated:
//     • happy path → new tenant created, user row with role=user
//     • tenant creation fails → bootstrap_failed
//
//   multi_user_single_workspace:
//     • first signup (no existing super_admin) → three rows on default tenant
//     • subsequent signup (super_admin exists) → invitation_required (signs out)
//     • default tenant missing → bootstrap_failed
//
//   multi_user_multi_workspace:
//     • happy path → new tenant + three role rows
//     • tenant creation fails → bootstrap_failed
//
//   Configuration edge cases:
//     • project_state.decisions has invalid signup_mode_v1 → falls back to
//       DEFAULT_SIGNUP_MODE
//     • project_state row missing entirely → falls back to DEFAULT_SIGNUP_MODE

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServiceClient, type TableConfig } from '@/test-utils/supabase-mock';
import { DEFAULT_SIGNUP_MODE } from '@/lib/signup-mode';

// Mock next/headers before any module that imports it loads.
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set:    () => {},
  })),
  headers: vi.fn(async () => new Map()),
}));

// Mock the endpoints module — the callback reads endpoints.projectId,
// supabaseUrl, supabaseAnonKey. We don't care about the values, but the
// import must resolve.
vi.mock('@/lib/endpoints', () => ({
  endpoints: {
    projectId:        'test-project',
    supabaseUrl:      'https://example.supabase.co',
    supabaseAnonKey:  'anon-key',
  },
}));

// The mock createServerClient (from @supabase/ssr) and the mock
// createServiceSupabaseClient (from @/lib/supabase.server) are set up
// per-test. We hold them in module-scoped refs so the mocks can swap their
// behavior between tests.
let mockUserClient: {
  auth: {
    exchangeCodeForSession: ReturnType<typeof vi.fn>;
    getUser:                ReturnType<typeof vi.fn>;
    signOut:                ReturnType<typeof vi.fn>;
  };
};
let mockServiceClient: ReturnType<typeof buildServiceClient>;

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockUserClient),
}));

vi.mock('@/lib/supabase.server', () => ({
  createServiceSupabaseClient: vi.fn(() => mockServiceClient),
  createServerSupabaseClient:  vi.fn(async () => mockUserClient),
  resolveEffectiveLens:        vi.fn(async () => null),
}));

// Mock the audit helper. Bootstrap now writes granular audit rows at each
// state-change step (decision: full coverage; lens: null; per-step inline
// writes). Tests assert on the bootstrap inserts, not on audit writes, so
// the audit helper is a silent no-op here. Audit semantics are exercised
// separately by the audit-server unit tests; this mock keeps the bootstrap
// matrix focused on its own contract.
vi.mock('@/lib/audit.server', () => ({
  audit: vi.fn(async () => { /* no-op */ }),
}));

// getSessionUser is called AFTER bootstrap to resolve the post-login
// redirect. We mock it to return a minimal session — the bootstrap-matrix
// tests don't care about post-login routing, just that bootstrap ran.
vi.mock('@/lib/auth', () => ({
  getSessionUser:       vi.fn(async () => ({
    id:            'user-1',
    email:         'test@example.com',
    active_lens:   'user',
    platform_role: null,
    tenant_id:     'tenant-1',
    all_roles:     [{ role: 'user', tenant_id: 'tenant-1' }],
  })),
  getPostLoginRedirect: vi.fn(() => '/app'),
}));

// Import AFTER mocks are registered. Vitest hoists the mocks, but the
// route module must load with mocks in place.
import { GET } from './route';

function makeRequest(url: string): import('next/server').NextRequest {
  return { url } as unknown as import('next/server').NextRequest;
}

function setUserClient(opts: {
  exchangeError?: string | null;
  user?:          { id: string; email: string } | null;
}) {
  const signOut = vi.fn(async () => ({ error: null }));
  mockUserClient = {
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
  };
  return { signOut };
}

function setServiceClient(config: TableConfig) {
  mockServiceClient = buildServiceClient(config);
  return mockServiceClient;
}

// Convenience: a pre-loaded user fixture used by most tests.
const TEST_USER = { id: 'user-1', email: 'newuser@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
});

// Helpers for building the queued responses each branch expects. Reading
// queries return one element; absent-row queries return null/[] depending
// on whether the route calls .maybeSingle() (null) or awaits the chain
// directly ([]).

function alreadyBootstrappedAppUsers() {
  // /app_users/.maybeSingle → returns a row
  return [{ op: 'select' as const, data: { id: 'user-1' } }];
}

function notBootstrappedAppUsers() {
  // /app_users/.maybeSingle → returns null
  return [{ op: 'select' as const, data: null }];
}

function noInvitations() {
  // /tenant_invitations/.select().eq().is().gte().order().limit() awaited
  // directly → returns []
  return [{ op: 'select' as const, data: [] }];
}

function withInvitation(invitation: { id: string; tenant_id: string; role: 'super_admin' | 'admin' | 'user'; expires_at: string }) {
  return [{ op: 'select' as const, data: [invitation] }];
}

function projectStateMode(mode: string | null) {
  // /project_state/.select().eq().maybeSingle → returns {decisions:{...}} | null
  if (mode === null) return [{ op: 'select' as const, data: null }];
  return [{ op: 'select' as const, data: { decisions: { signup_mode_v1: mode } } }];
}

function defaultTenantExists(tenantId: string) {
  // /tenants/.select().order().limit() awaited → [{id}]
  return [{ op: 'select' as const, data: [{ id: tenantId }] }];
}

function defaultTenantMissing() {
  return [{ op: 'select' as const, data: [] }];
}

function existingSuperAdmin() {
  // /tenant_members/.select().eq().eq().eq().limit() awaited → [{id}]
  return [{ op: 'select' as const, data: [{ id: 'mem-1' }] }];
}

function noExistingSuperAdmin() {
  return [{ op: 'select' as const, data: [] }];
}

function okInsert() {
  return { op: 'insert' as const, data: null, error: null };
}

function failedInsert(message: string) {
  return { op: 'insert' as const, data: null, error: { message } };
}

function tenantInsertReturning(id: string) {
  return { op: 'insert' as const, data: { id } };
}

// ── Top-level guard tests ───────────────────────────────────────────────────

describe('auth/callback — top-level guards', () => {
  it('missing code redirects to login with callback_failed', async () => {
    setUserClient({ user: null });
    setServiceClient({});
    const res = await GET(makeRequest('https://app.test/auth/callback'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=callback_failed');
  });

  it('exchange error redirects to login with callback_failed', async () => {
    setUserClient({ exchangeError: 'bad-code', user: null });
    setServiceClient({});
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=callback_failed');
  });

  it('null user after exchange redirects to login with callback_failed', async () => {
    setUserClient({ user: null });
    setServiceClient({});
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=callback_failed');
  });

  it('already-bootstrapped user skips bootstrap and follows post-login redirect', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: alreadyBootstrappedAppUsers(),
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    // No inserts should have happened.
    expect(svc.inserts).toHaveLength(0);
  });
});

// ── Invitation path (mode-agnostic; tested with multi_user_single_workspace
//    as the configured mode, since the invitation path runs before the
//    mode read). ──────────────────────────────────────────────────────────

describe('auth/callback — invitation path', () => {
  it('accepts a valid pending invitation and inserts app_users + tenant_members', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(), // app_users insert during invitation accept
      ],
      tenant_invitations: [
        ...withInvitation({
          id:         'inv-1',
          tenant_id:  'tenant-xyz',
          role:       'admin',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }),
      ],
      tenant_members: [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    // Verify the insert payloads.
    expect(svc.inserts.map(i => i.table)).toEqual(['app_users', 'tenant_members']);
    expect(svc.inserts[1].payload).toMatchObject({
      user_id:   'user-1',
      tenant_id: 'tenant-xyz',
      role:      'admin',
      status:    'active',
    });
    // Invitation update was captured.
    expect(svc.updates.some(u => u.table === 'tenant_invitations')).toBe(true);
  });

  it('falls through to signup_mode when no live invitation exists', async () => {
    setUserClient({ user: TEST_USER });
    const tenantId = 'default-tenant-id';
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(), // insertAppUser for single_user_shared
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('single_user_shared'),
      tenants:            defaultTenantExists(tenantId),
      tenant_members:     [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    // Verify it took the signup_mode branch (tenant_members insert with role=user).
    const memberInsert = svc.inserts.find(i => i.table === 'tenant_members');
    expect(memberInsert?.payload).toMatchObject({ role: 'user', tenant_id: tenantId });
  });

  it('reports bootstrap_failed when invitation app_users insert throws', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        failedInsert('duplicate key'),
      ],
      tenant_invitations: [
        ...withInvitation({
          id: 'inv-1', tenant_id: 't', role: 'user',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }),
      ],
      // tenant_members insert won't be reached but the mock errors loudly
      // if a code path tries it.
      tenant_members: [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    // The current tryInvitationPath swallows insert errors via try/catch
    // and returns 'failed'. Verify the right redirect.
    expect(res.headers.get('location')).toContain('error=bootstrap_failed');
  });
});

// ── single_user_shared ──────────────────────────────────────────────────────

describe('auth/callback — single_user_shared', () => {
  it('happy path: inserts app_users and tenant_members(role=user) on default tenant', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('single_user_shared'),
      tenants:            defaultTenantExists('default-tenant'),
      tenant_members:     [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    const member = svc.inserts.find(i => i.table === 'tenant_members');
    expect(member?.payload).toMatchObject({
      tenant_id: 'default-tenant',
      role:      'user',
      status:    'active',
    });
  });

  it('reports bootstrap_failed when no default tenant exists', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('single_user_shared'),
      tenants:            defaultTenantMissing(),
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=bootstrap_failed');
  });
});

// ── single_user_isolated ────────────────────────────────────────────────────

describe('auth/callback — single_user_isolated', () => {
  it('happy path: creates new tenant and inserts tenant_members(role=user)', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('single_user_isolated'),
      tenants:            [
        tenantInsertReturning('new-isolated-tenant'),  // consumed by .insert()
        { op: 'select' as const, data: { id: 'new-isolated-tenant' } }, // consumed by .single()
      ],
      tenant_members:     [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    // A new tenant was created via insert (not by reading the default).
    expect(svc.inserts.some(i => i.table === 'tenants')).toBe(true);
    const member = svc.inserts.find(i => i.table === 'tenant_members');
    expect(member?.payload).toMatchObject({
      tenant_id: 'new-isolated-tenant',
      role:      'user',
    });
  });

  it('reports bootstrap_failed when tenant creation fails', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('single_user_isolated'),
      tenants:            [
        { op: 'insert' as const, data: null },       // consumed by .insert()
        { op: 'select' as const, data: null, error: { message: 'tenants_insert_failed' } }, // .single() returns error
      ],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=bootstrap_failed');
  });
});

// ── multi_user_single_workspace ─────────────────────────────────────────────

describe('auth/callback — multi_user_single_workspace', () => {
  it('first signup becomes super_admin: inserts app_users + three tenant_members rows', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('multi_user_single_workspace'),
      tenants:            defaultTenantExists('the-workspace'),
      tenant_members:     [
        ...noExistingSuperAdmin(),
        okInsert(), // bulk insert of 3 rows
      ],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    const member = svc.inserts.find(i => i.table === 'tenant_members');
    expect(Array.isArray(member?.payload)).toBe(true);
    const payload = member?.payload as Array<{ role: string; tenant_id: string }>;
    expect(payload.map(r => r.role).sort()).toEqual(['admin', 'super_admin', 'user']);
    expect(payload.every(r => r.tenant_id === 'the-workspace')).toBe(true);
  });

  it('subsequent signup (super_admin exists) returns invitation_required and signs out', async () => {
    const userMocks = setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users:          notBootstrappedAppUsers(),
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('multi_user_single_workspace'),
      tenants:            defaultTenantExists('the-workspace'),
      tenant_members:     existingSuperAdmin(),
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=invitation_required');
    expect(userMocks.signOut).toHaveBeenCalled();
    // No app_users insert — the user gets signed out before seeding.
    expect(svc.inserts.filter(i => i.table === 'app_users')).toHaveLength(0);
  });

  it('reports bootstrap_failed when default tenant is missing', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users:          notBootstrappedAppUsers(),
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('multi_user_single_workspace'),
      tenants:            defaultTenantMissing(),
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=bootstrap_failed');
  });
});

// ── multi_user_multi_workspace ──────────────────────────────────────────────

describe('auth/callback — multi_user_multi_workspace', () => {
  it('happy path: creates new tenant and seeds three roles for the signer', async () => {
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('multi_user_multi_workspace'),
      tenants:            [
        tenantInsertReturning('new-workspace'),
        { op: 'select' as const, data: { id: 'new-workspace' } },
      ],
      tenant_members:     [okInsert()],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    expect(svc.inserts.some(i => i.table === 'tenants')).toBe(true);
    const member = svc.inserts.find(i => i.table === 'tenant_members');
    const payload = member?.payload as Array<{ role: string; tenant_id: string }>;
    expect(payload.map(r => r.role).sort()).toEqual(['admin', 'super_admin', 'user']);
    expect(payload.every(r => r.tenant_id === 'new-workspace')).toBe(true);
  });

  it('reports bootstrap_failed when new tenant creation fails', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode('multi_user_multi_workspace'),
      tenants:            [
        { op: 'insert' as const, data: null },
        { op: 'select' as const, data: null, error: { message: 'tenants_insert_failed' } },
      ],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('error=bootstrap_failed');
  });
});

// ── Config edge cases ───────────────────────────────────────────────────────

describe('auth/callback — signup_mode config edge cases', () => {
  it('invalid stored signup_mode_v1 falls back to DEFAULT_SIGNUP_MODE', async () => {
    // DEFAULT_SIGNUP_MODE is multi_user_single_workspace. Simulate a fresh
    // workspace (no super_admin exists yet) and assert the same path the
    // first-signup test exercised runs.
    setUserClient({ user: TEST_USER });
    const svc = setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      [{
        op: 'select' as const,
        data: { decisions: { signup_mode_v1: 'something_unrecognized' } },
      }],
      tenants:            defaultTenantExists('the-workspace'),
      tenant_members:     [
        ...noExistingSuperAdmin(),
        okInsert(),
      ],
    });
    expect(DEFAULT_SIGNUP_MODE).toBe('multi_user_single_workspace');
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
    const member = svc.inserts.find(i => i.table === 'tenant_members');
    const payload = member?.payload as Array<{ role: string }>;
    expect(payload.map(r => r.role).sort()).toEqual(['admin', 'super_admin', 'user']);
  });

  it('missing project_state row falls back to DEFAULT_SIGNUP_MODE', async () => {
    setUserClient({ user: TEST_USER });
    setServiceClient({
      app_users: [
        ...notBootstrappedAppUsers(),
        okInsert(),
      ],
      tenant_invitations: noInvitations(),
      project_state:      projectStateMode(null),
      tenants:            defaultTenantExists('the-workspace'),
      tenant_members:     [
        ...noExistingSuperAdmin(),
        okInsert(),
      ],
    });
    const res = await GET(makeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.get('location')).toContain('/app');
  });
});
