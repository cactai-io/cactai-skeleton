import { type ReactNode } from 'react';
export interface SelfDrivenDevShellProps {
    /** Same-origin proxy mount point (e.g. '/api/cactai' on the skeleton).
     *  Forwarded to CactaiClient as base_url AND to MUIShell as api_base_url. */
    cactaiBase: string;
    /** Project UUID. */
    projectId: string;
    /** Project display name (shown in the top bar). Default 'App'. */
    projectName?: string;
    /** Authenticated developer's identity. */
    userId: string;
    userEmail: string;
    /** Skeleton role string ('dev' | 'collaborator' | etc.) — opaque to the
     *  wrapper. mui's DevShellRole interface is { role, label, session_id }
     *  for per-role preview tabs; we leave that empty in Phase 1. */
    userRole: string;
    allRoles: Array<{
        role: string;
        tenant_id: string | null;
    }>;
    /** Optional dashboard URL — for the avatar menu's "Dashboard" link.
     *  Defaults to the standard Cactai dashboard. */
    dashboardUrl?: string;
    /** Production URL of the deployed customer app (NEXT_PUBLIC_SITE_URL
     *  on the skeleton side). Wired through to workspaceProps.onOpenApp
     *  so the Workspace panel's "Open app" button lands the developer
     *  on the live deployment in a new tab. */
    productionUrl?: string;
    children?: ReactNode;
}
export declare function SelfDrivenDevShell({ cactaiBase, projectId, projectName, userId, userEmail, dashboardUrl, productionUrl, }: SelfDrivenDevShellProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SelfDrivenDevShell.d.ts.map