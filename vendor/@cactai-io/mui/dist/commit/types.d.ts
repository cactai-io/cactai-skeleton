import type { PendingOperation } from '@cactai-io/types';
export type SyncBranch = 'local' | 'dev';
export type SyncState = {
    branch: 'local';
    uncommittedFiles: string[];
} | {
    branch: 'dev';
    synced: true;
};
export interface PendingFileSummary {
    path: string;
    operation: PendingOperation;
    newPath?: string;
    linesAdded: number;
    linesRemoved: number;
    lastEditedAt: string;
}
export declare function isLocal(state: SyncState): state is Extract<SyncState, {
    branch: 'local';
}>;
export declare function isSyncedToDev(state: SyncState): boolean;
export declare function pendingCount(state: SyncState): number;
export declare function formatSyncLabel(state: SyncState): string;
export declare function deriveSyncState(args: {
    uncommittedFiles: string[];
}): SyncState;
export type PreviewBehavior = 'live' | 'needs_deploy';
export declare function previewBehaviorFor(path: string): PreviewBehavior;
