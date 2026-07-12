// Tenant context (multi-tenant variant). This directory is deleted whole by
// the single-tenant prune (D-T80: src/lib/tenancy/ rides file_deletions).
// The active tenant is client state; every server call carries it explicitly.

'use client';

import { createContext, useContext } from 'react';

export interface ActiveTenant {
  readonly tenant_id: string;
  readonly display_name: string;
  readonly role: 'app-owner' | 'tenant-admin' | 'user';
}

export const TenantContext = createContext<ActiveTenant | null>(null);

export function useActiveTenant(): ActiveTenant | null {
  return useContext(TenantContext);
}
