import { type ReactNode } from 'react';
import type { PendingFileSummary } from './types.js';
export interface PendingFileRow extends PendingFileSummary {
    original_content?: string | null;
    current_content?: string | null;
}
export interface PendingEditsModalProps {
    /** Files with uncommitted local edits. Already sorted by parent or
     *  re-sorted internally if needed; we re-sort defensively. */
    files: PendingFileRow[];
    /** Paths pre-selected when the modal opens. Per-file affordance case. */
    initialSelection?: ReadonlyArray<string>;
    /** True while a commit is in flight. Disables interaction. */
    committing?: boolean;
    /** Inline error banner. Cleared by the parent before the next attempt. */
    error?: string | null;
    /** Commit the selected paths to dev. */
    onCommitToDev: (paths: string[]) => void;
    /** Discard a single pending row by path. */
    onDiscardOne: (path: string) => void;
    /** Discard every pending row. Confirmation handled by this component. */
    onDiscardAll: () => void;
    /** Open the commit-history modal (sibling, parent-managed). */
    onOpenHistory: () => void;
    /** Close the modal. */
    onCancel: () => void;
    /** Toggle the ⓘ guide (origin modal-split). When provided, renders the ⓘ
     *  button in the header. The host owns the open/close state and passes the
     *  rendered panel via guideSlot. */
    onOpenGuide?: () => void;
    /** The guide panel to overlay the modal body when open. Rendered by the host
     *  (a <GuidePanel origin="modal-split">) so content stays server-fetched. */
    guideSlot?: ReactNode;
}
export declare function PendingEditsModal({ files, initialSelection, committing, error, onCommitToDev, onDiscardOne, onDiscardAll, onOpenHistory, onCancel, onOpenGuide, guideSlot, }: PendingEditsModalProps): import("react/jsx-runtime").JSX.Element;
