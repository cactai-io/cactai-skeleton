// The tenant switcher (multi-tenant variant; deleted whole by the
// single-tenant prune — D-T80 file_deletions). Renders the member's tenants
// and switches the active one; membership comes from the server.

'use client';

import type { JSX } from 'react';

export interface TenantChoice {
  readonly tenant_id: string;
  readonly display_name: string;
}

export function TenantSwitcher(props: {
  readonly tenants: readonly TenantChoice[];
  readonly activeId: string | null;
  readonly onSwitch: (tenantId: string) => void;
}): JSX.Element {
  return (
    <label data-tenant-switcher="true">
      Tenant{' '}
      <select value={props.activeId ?? ''} onChange={(e) => props.onSwitch(e.currentTarget.value)}>
        {props.tenants.map((t) => (
          <option key={t.tenant_id} value={t.tenant_id}>{t.display_name}</option>
        ))}
      </select>
    </label>
  );
}
