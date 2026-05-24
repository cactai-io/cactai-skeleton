import type { PendingOperation } from '@cactai-io/types';
export interface CommitListItem {
    commit_sha: string;
    committer_id: string;
    committed_at: string;
    message: string;
    /** Set by Thread 12 when this commit was created by the revert flow.
     *  Drives the "Revert of <sha>" pill on the group header. Null on
     *  normal commits. */
    reverts_sha: string | null;
}
export interface CommitFileItem {
    commit_sha: string;
    path: string;
    operation: PendingOperation;
    new_path: string | null;
    last_edited_at: string;
    lines_added: number;
    lines_removed: number;
    original_content: string | null;
    current_content: string | null;
}
export interface CommitHistoryModalProps {
    /** Deep-link target for the "View on GitHub" footer button. The route
     *  appends nothing — pass a fully-formed URL such as
     *  https://github.com/<owner>/<repo>/commits/dev. Hidden when omitted. */
    repoCommitsUrl?: string;
    /** Optional callback for the per-commit "Revert this commit" action.
     *  When omitted, the action item is hidden. Wired by Thread 12 from
     *  the DevShell; the modal itself is reverting-agnostic and only
     *  presents the affordance + a confirmation. */
    onRevertCommit?: (commit: CommitListItem) => void;
    /** Override fetch for tests. */
    fetchFn?: typeof fetch;
    onClose: () => void;
}
export type TimeRangeChoice = {
    kind: 'all';
} | {
    kind: 'week';
} | {
    kind: 'month';
} | {
    kind: 'quarter';
} | {
    kind: 'custom';
    fromIso: string | null;
    toIso: string | null;
};
export declare function CommitHistoryModal({ repoCommitsUrl, onRevertCommit, fetchFn, onClose, }: CommitHistoryModalProps): import("react/jsx-runtime").JSX.Element;
export declare const COMMIT_HISTORY_PAGE_SIZE = 20;
