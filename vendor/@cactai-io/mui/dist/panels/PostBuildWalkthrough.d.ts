export interface WalkthroughTab {
    /** Rail section / config-tab key the host knows how to open. */
    key: string;
    label: string;
    description: string;
}
export interface PostBuildWalkthroughProps {
    open: boolean;
    tabs: WalkthroughTab[];
    /** Host switches the rail to this tab's builder (and closes the walkthrough). */
    onConfigure: (key: string) => void;
    /** Host drops a "Setup <tab>" backlog item for later. */
    onSkip: (key: string) => void;
    onClose: () => void;
    personalityName?: string;
}
export declare function PostBuildWalkthrough({ open, tabs, onConfigure, onSkip, onClose, personalityName, }: PostBuildWalkthroughProps): import("react/jsx-runtime").JSX.Element | null;
export declare function deriveWalkthroughTabs(opts: {
    ai?: boolean;
    paid?: boolean;
    sharing?: boolean;
    collaboration?: boolean;
}): WalkthroughTab[];
export default PostBuildWalkthrough;
