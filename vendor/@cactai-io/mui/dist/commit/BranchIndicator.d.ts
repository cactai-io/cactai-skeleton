import { type ReactNode } from 'react';
import type { JSX } from 'react';
export interface BranchIndicatorCommit {
    sha: string;
    message: string;
    author: string;
    timestamp: string;
    url: string;
}
export interface BranchIndicatorProps {
    /** Current branch name (e.g. 'dev'). */
    branch: string;
    /** Last commit on the branch — drives the inline summary line. May be
     *  null briefly while the host fetches branch info. */
    lastCommit?: BranchIndicatorCommit | null;
    /** Recent commit list for the dropdown. Optional; when omitted the
     *  dropdown shows only the GitHub-link entry. */
    recentCommits?: BranchIndicatorCommit[];
    /** GitHub URL to the branches page — surfaced as "View branches on GitHub". */
    branchesUrl?: string;
    /** Called when the developer clicks a commit in the dropdown. The host
     *  opens the inline DiffViewer with that commit. */
    onCommitClick?: (sha: string) => void;
    /** Optional render override for the leading icon. */
    icon?: ReactNode;
}
export declare function BranchIndicator(props: BranchIndicatorProps): JSX.Element;
