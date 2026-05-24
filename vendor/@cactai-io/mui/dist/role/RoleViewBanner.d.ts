import type { PendingOperation } from '@cactai-io/types';
export interface RoleViewBannerPendingFile {
    path: string;
    operation: PendingOperation;
}
export interface RoleViewBannerProps {
    /** Stable id for this project. Used as the sessionStorage dismissal
     *  key so a banner the developer dismisses for one project doesn't
     *  stay dismissed for another. */
    projectId: string;
    /** Snapshot of the current pending files. Banner checks against this
     *  for eligibility. */
    pendingFiles: ReadonlyArray<RoleViewBannerPendingFile>;
    /** Optional path of the file or route the role-view is currently
     *  rendering. When provided, the banner only fires when a pending
     *  edit's path matches this value. When omitted, the banner fires
     *  when any pending non-config code edit exists — defensive default. */
    activeRoleViewPath?: string;
    /** Optional handler so the parent can also clear chat-side state or
     *  fire telemetry. Defaults to no-op; the dismissal flag is owned by
     *  this component. */
    onDismiss?: () => void;
}
export declare function RoleViewBanner({ projectId, pendingFiles, activeRoleViewPath, onDismiss, }: RoleViewBannerProps): import("react/jsx-runtime").JSX.Element | null;
