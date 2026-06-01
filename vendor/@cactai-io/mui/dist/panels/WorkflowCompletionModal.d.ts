export interface WorkflowCompletionModalProps {
    open: boolean;
    onClose: () => void;
    githubRepoUrl?: string;
    productionUrl?: string;
    /** Top-rank role name from tenant_roles_catalog (e.g. "super_admin",
     *  or whatever the developer renamed it to). When present AND the
     *  app's signup_mode causes auto-promotion on tenant creation, the
     *  conditional role-claim section appears. Omit to suppress the
     *  section entirely (apps with no role hierarchy). */
    topRankRoleName?: string;
    /** True when the app's configured signup mode results in the first
     *  user becoming the top-rank role automatically. Pair with
     *  topRankRoleName to gate the role-claim section. */
    autoPromoteOnFirstSignup?: boolean;
}
export declare function WorkflowCompletionModal({ open, onClose, githubRepoUrl, productionUrl, topRankRoleName, autoPromoteOnFirstSignup, }: WorkflowCompletionModalProps): import("react/jsx-runtime").JSX.Element | null;
