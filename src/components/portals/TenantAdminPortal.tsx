// @prune:user_portal.tenant_admin:start
// The multi-tenant user portal: a tenant-admin role surface (D-T80). Members,
// invitations, and suspensions scoped to the active tenant; the customer DB's
// per-tenant RLS enforces isolation beneath this surface.

import type { JSX } from 'react';

export function TenantAdminPortal(): JSX.Element {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Members</h1>
      <p>
        The members of your active tenant. Invitations, role changes, and
        suspensions apply within this tenant only — per-tenant isolation is
        enforced by the database, not this page.
      </p>
    </main>
  );
}
// @prune:user_portal.tenant_admin:end
