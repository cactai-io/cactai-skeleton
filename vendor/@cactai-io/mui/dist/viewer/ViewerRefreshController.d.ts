import { type RefObject } from 'react';
import type { DeployEvent } from '@cactai-io/types';
export type ViewerRefreshStatus = 'idle' | 'queued' | 'refreshing';
export interface UseViewerAutoRefreshOptions {
    /** Container ref watched for interaction events. Typically the panel
     *  that wraps the iframe. Pointer/keyboard activity inside this
     *  element counts as "active interaction" and defers refresh.
     *  Defaults to the document — convenient but means any activity in
     *  the surrounding shell debounces the refresh. */
    containerRef?: RefObject<HTMLElement | null>;
    /** Called when the controller decides it's time to refresh. The host
     *  reloads the iframe by setting `iframe.src = iframe.src` or by
     *  swapping a `key` prop. The controller has no opinion. */
    refreshIframe: () => void;
    /** Override the debounce window. Useful for tests. */
    debounceMs?: number;
    /** Override the hard-cap deferment window. Useful for tests. */
    maxDeferMs?: number;
}
export interface ViewerAutoRefreshState {
    /** Current controller state. 'queued' surfaces the "refresh queued"
     *  chat note; 'refreshing' lets the host show a quick spinner. */
    status: ViewerRefreshStatus;
    /** Apply an incoming deploy event. The host's SSE subscriber wires
     *  this up. The controller decides whether to refresh now / queue. */
    applyDeployEvent: (event: DeployEvent) => void;
    /** Force an immediate refresh, bypassing the debounce. Used for the
     *  "Refresh now" button surfaced when the queue is pending. */
    refreshNow: () => void;
    /** Cancel a queued refresh. Used when the developer dismisses the
     *  "refresh queued" notice. */
    cancelQueued: () => void;
}
/** Hook that owns the auto-refresh state machine. Wire the returned
 *  `applyDeployEvent` into the host's deploy-events SSE subscriber. */
export declare function useViewerAutoRefresh(options: UseViewerAutoRefreshOptions): ViewerAutoRefreshState;
export interface ViewerRefreshControllerProps extends UseViewerAutoRefreshOptions {
    /** Async iterable / EventSource-like for deploy events. The component
     *  subscribes via `addEventListener('message')` and forwards each
     *  parsed `DeployEvent` to applyDeployEvent. When omitted, the host
     *  wires events manually by calling the returned controller. */
    eventSource?: {
        addEventListener: (type: string, listener: (e: MessageEvent) => void) => void;
        removeEventListener: (type: string, listener: (e: MessageEvent) => void) => void;
    };
    /** Optional render prop — receives the controller state so the host
     *  can show the "refresh queued" notice + a "Refresh now" button. */
    children?: (state: ViewerAutoRefreshState) => React.ReactNode;
}
/** Optional convenience component. Hosts that want to wire the auto-
 *  refresh logic declaratively can mount this and supply an EventSource
 *  emitting the deploy SSE stream. Hosts that want to manage the timing
 *  imperatively (e.g. with their own EventSource handling) should use
 *  the `useViewerAutoRefresh` hook directly. */
export declare function ViewerRefreshController(props: ViewerRefreshControllerProps): React.ReactElement | null;
