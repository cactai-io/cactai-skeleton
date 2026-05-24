import React from 'react';
export interface SandboxedRendererProps {
    /** Generated component code from GenerationResult.code. */
    code: string;
    /** Artifact data the component renders. Sent to the iframe via postMessage. */
    artifact: unknown;
    /** Theme tokens; sent to the iframe alongside artifact. */
    theme: Record<string, unknown>;
    /** Called when the iframe posts a message back to the parent. */
    onMessage?: (msg: unknown) => void;
    /** Called when the iframe fails to mount the generated component. */
    onError?: (err: string) => void;
    /** Hard cap on iframe height. Default: 600px. */
    maxHeight?: number;
    /** Title for accessibility — required by HTML spec for iframes. */
    title?: string;
}
export declare const SandboxedRenderer: React.FC<SandboxedRendererProps>;
