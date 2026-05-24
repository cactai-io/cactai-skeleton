import { type ReactNode } from 'react';
import type { JSX } from 'react';
/** Generic role union. The skeleton passes its own role enum here; the
 *  package treats it as opaque. Data-driven roles (post role-catalog) work
 *  because nothing in this package validates the value. */
export type DevShellRole = string;
export interface DevShellEndpoints {
    /** Base URL of the Cactai platform API (e.g. https://api.cactai.io). */
    cactaiBase: string;
    /** The current project's UUID, used to scope session creation. */
    projectId: string;
}
export interface DevShellProviderProps {
    userId: string;
    userEmail: string;
    userRole: DevShellRole;
    allRoles: Array<{
        role: DevShellRole;
        tenant_id: string | null;
    }>;
    endpoints: DevShellEndpoints;
    /** URL the gear button links to. Skeleton typically passes '/dev/preferences'. */
    preferencesHref?: string;
    previewUrl?: string;
    children?: ReactNode;
}
export declare function DevShellProvider({ userId, userEmail, userRole, endpoints, preferencesHref, }: DevShellProviderProps): JSX.Element;
//# sourceMappingURL=DevShellProvider.d.ts.map