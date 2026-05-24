export interface DeployIndicatorProps {
    /** Cactai project id (UUID). The SSE endpoint is
     *  /v1/projects/<projectId>/deploy-events on the platform. */
    projectId: string;
    /** Platform base URL — e.g. https://api.cactai.dev. The component
     *  appends /v1/projects/<projectId>/deploy-events. When omitted the
     *  component uses a relative URL, suitable for a same-origin proxy. */
    platformBaseUrl?: string;
    /** Bearer token (developer's API key or a session-scoped derivative).
     *  Passed as `?token=...` on the EventSource URL. */
    bearerToken: string;
    /** Optional override for tests. When provided, this is used instead
     *  of `window.EventSource`. The fake should mimic EventSource's
     *  contract: `.addEventListener(type, handler)` and `.close()`. */
    eventSourceFactory?: (url: string) => EventSourceLike;
    /** Optional override for `window.location.reload`. Tests pass a
     *  stub here so they don't actually reload jsdom. */
    reloadFn?: () => void;
    /** Optional Vercel-dashboard URL for the red-state tooltip /
     *  click-through. When absent, the red state shows a generic
     *  "Build failed" message without a link. */
    vercelDashboardUrl?: string;
}
export interface EventSourceLike {
    addEventListener(type: string, listener: (ev: {
        data: string;
    }) => void): void;
    removeEventListener?(type: string, listener: (ev: {
        data: string;
    }) => void): void;
    close(): void;
}
export declare function DeployIndicator({ projectId, platformBaseUrl, bearerToken, eventSourceFactory, reloadFn, vercelDashboardUrl, }: DeployIndicatorProps): import("react/jsx-runtime").JSX.Element;
