/** Message types the parent → iframe direction emits. */
export type ParentToIframeMessage = {
    type: 'cactai-inspect:enable';
} | {
    type: 'cactai-inspect:disable';
} | {
    type: 'cactai-inspect:ping';
};
/** Message types the iframe → parent direction emits. */
export type IframeToParentMessage = {
    type: 'cactai-inspect:ready';
} | {
    type: 'cactai-inspect:hover';
    payload: SourceLocation | null;
} | {
    type: 'cactai-inspect:select';
    payload: SourceLocation;
} | {
    type: 'cactai-inspect:no-match';
    payload: {
        reason: NoMatchReason;
        element_tag?: string;
        element_text?: string;
    };
};
/** Why an element couldn't be traced to a source location. Drives the
 *  fallback messaging in the chat (Gap 139). */
export type NoMatchReason = 
/** Element has no data-source-location and no ancestor with one. */
'no_source_location'
/** Element is rendered by a third-party package or skeleton shell. */
 | 'third_party';
/** The structured payload the iframe sends on successful selection.
 *  Mirrors what the directory viewer needs to open the right file at
 *  the right line + what the orchestrator includes in chat context. */
export interface SourceLocation {
    /** Path relative to the project root (forward-slash separated). */
    filename: string;
    /** 1-indexed source line. */
    line: number;
    /** 1-indexed source column. */
    column: number;
    /** Lowercase HTML tag of the clicked element (e.g. 'button'). */
    element_tag: string;
    /** Short text content extracted from the element (max 80 chars). */
    element_text?: string;
    /** Subset of attributes the chat can reference (className, id, role,
     *  aria-label, data-testid). Omitted when none are present. */
    element_attrs?: Record<string, string>;
    /** Whether the location came from an ancestor walk (the clicked
     *  element itself had no source-location attribute). */
    via_ancestor?: boolean;
    /** Component file inferred from filename (always equals filename for
     *  v1 — the dirname/basename split is a future refinement). */
    component_file?: string;
}
/** Build an allowlist of acceptable iframe origins. Hosts pass their
 *  expected preview URLs (e.g. the developer's Vercel deployment).
 *  Same-origin postMessage is always allowed since both windows share
 *  the parent origin. */
export interface OriginCheckOptions {
    /** Origins the parent will accept iframe messages from. Typically
     *  the developer's Vercel preview URLs + the project's production
     *  URL. */
    allowedOrigins: string[];
    /** The parent window's own origin. Always implicitly allowed. */
    parentOrigin: string;
}
/** Validate a postMessage event against the configured origin set.
 *  Returns true when the event should be processed. */
export declare function isAcceptableOrigin(origin: string, options: OriginCheckOptions): boolean;
export declare function isInspectMessage(data: unknown): data is IframeToParentMessage | ParentToIframeMessage;
export declare function isIframeToParent(data: unknown): data is IframeToParentMessage;
export declare function isParentToIframe(data: unknown): data is ParentToIframeMessage;
