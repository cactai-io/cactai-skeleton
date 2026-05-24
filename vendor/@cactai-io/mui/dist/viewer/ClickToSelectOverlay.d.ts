import { type RefObject } from 'react';
import type { JSX } from 'react';
export interface ClickToSelectOverlayProps {
    /** Ref to the iframe whose contentWindow receives enable/disable
     *  postMessages. */
    iframeRef: RefObject<HTMLIFrameElement | null>;
    /** Allowed origins for postMessage. Typically the developer's Vercel
     *  preview URL + any production domain. The parent's own origin is
     *  always accepted via parentOrigin. */
    allowedOrigins: string[];
    /** Optional: surface the first-time hint once per developer per
     *  device. Defaults to true. */
    showFirstTimeHint?: boolean;
}
export declare function ClickToSelectOverlay(props: ClickToSelectOverlayProps): JSX.Element;
