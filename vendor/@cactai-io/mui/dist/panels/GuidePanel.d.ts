import type { GuideBlock, GuideOrigin } from '@cactai-io/types';
export interface GuidePanelProps {
    open: boolean;
    onClose: () => void;
    origin: GuideOrigin;
    title: string;
    blocks: GuideBlock[];
    /** True while the host is still fetching content. Renders a quiet shimmer
     *  row instead of an empty panel so the slide-in never reveals blank space. */
    loading?: boolean;
}
export declare function GuidePanel({ open, onClose, origin, title, blocks, loading }: GuidePanelProps): import("react/jsx-runtime").JSX.Element | null;
