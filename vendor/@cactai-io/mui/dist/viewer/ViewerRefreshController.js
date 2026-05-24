'use client';
// packages/mui/src/viewer/ViewerRefreshController.tsx
// Viewer auto-refresh with interaction-aware debounce (Gap 148).
//
// When a `state === 'ready'` deploy event arrives, the iframe content
// should reload so the developer sees the new build. Auto-refreshing
// regardless would destroy in-flight interaction state (typing in a form,
// scrolled position, modal open). The controller defers refresh while
// the developer is actively interacting and falls back to a forced refresh
// after MAX_DEFER_MS.
//
// Behavior per vercel-deployment-webhook.md "Viewer Auto-Refresh":
//
//   1. Deploy event with state='ready' arrives.
//   2. If no recent interaction → refresh immediately (DEBOUNCE_MS).
//   3. If recent interaction → wait DEBOUNCE_MS after the last interaction.
//   4. If interaction continues past MAX_DEFER_MS since the event arrived,
//      refresh anyway. The developer's interaction state is sacrificed —
//      better than them looking at stale content indefinitely.
//   5. Surface the queued state to the chat surface so the developer
//      knows what's happening ("Deployment complete — refresh queued").
//
// The controller is presentation-free — it owns the timing logic and
// invokes a `refreshIframe` callback when the time comes. The host
// component (DevShell.tsx or its viewer panel) supplies the iframe ref
// and the deploy event stream.
'use client';
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
const DEBOUNCE_MS = 3_000; // wait this long after last interaction
const MAX_DEFER_MS = 30_000; // upper bound from event arrival
const INTERACTION_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
/** Hook that owns the auto-refresh state machine. Wire the returned
 *  `applyDeployEvent` into the host's deploy-events SSE subscriber. */
export function useViewerAutoRefresh(options) {
    const debounceMs = options.debounceMs ?? DEBOUNCE_MS;
    const maxDeferMs = options.maxDeferMs ?? MAX_DEFER_MS;
    const [status, setStatus] = useState('idle');
    const lastInteractionRef = useRef(0);
    const debounceTimerRef = useRef(null);
    const maxDeferTimerRef = useRef(null);
    const queueStartedAtRef = useRef(0);
    // Track interaction on the container (or the document if no container
    // was supplied). Updates lastInteractionRef without rerenders.
    useEffect(() => {
        const target = options.containerRef?.current ?? document;
        const handler = () => { lastInteractionRef.current = Date.now(); };
        for (const ev of INTERACTION_EVENTS) {
            target.addEventListener(ev, handler, { passive: true });
        }
        return () => {
            for (const ev of INTERACTION_EVENTS) {
                target.removeEventListener(ev, handler);
            }
        };
    }, [options.containerRef]);
    const clearTimers = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (maxDeferTimerRef.current) {
            clearTimeout(maxDeferTimerRef.current);
            maxDeferTimerRef.current = null;
        }
    }, []);
    const doRefresh = useCallback(() => {
        clearTimers();
        setStatus('refreshing');
        try {
            options.refreshIframe();
        }
        finally {
            // The iframe reload is synchronous from the host's perspective
            // (assigning src kicks off a load). Drop back to idle on the next
            // tick so the spinner flashes briefly.
            setTimeout(() => setStatus('idle'), 200);
        }
    }, [options, clearTimers]);
    const scheduleRefresh = useCallback(() => {
        // (Re)arm the debounce: wait DEBOUNCE_MS after the most recent
        // interaction. If interaction continues to land, the timer keeps
        // resetting until MAX_DEFER_MS forces a refresh.
        if (debounceTimerRef.current)
            clearTimeout(debounceTimerRef.current);
        const sinceLast = Date.now() - lastInteractionRef.current;
        const wait = Math.max(debounceMs - sinceLast, 0);
        debounceTimerRef.current = setTimeout(() => {
            // Re-check at fire time: if the developer interacted within the
            // last DEBOUNCE_MS, re-arm the timer.
            const now = Date.now();
            if (now - lastInteractionRef.current < debounceMs) {
                scheduleRefresh();
                return;
            }
            doRefresh();
        }, wait + 50);
    }, [debounceMs, doRefresh]);
    const applyDeployEvent = useCallback((event) => {
        // Only `ready` triggers auto-refresh. building/error/canceled don't
        // affect the iframe — DeployIndicator handles their visual state
        // elsewhere.
        if (event.state !== 'ready')
            return;
        // No active interaction recently → refresh immediately.
        const sinceLast = Date.now() - lastInteractionRef.current;
        if (sinceLast >= debounceMs) {
            doRefresh();
            return;
        }
        // Queue the refresh. Surface the queued status so the host can show
        // a chat note. The MAX_DEFER timer caps the deferment.
        setStatus('queued');
        queueStartedAtRef.current = Date.now();
        scheduleRefresh();
        if (maxDeferTimerRef.current)
            clearTimeout(maxDeferTimerRef.current);
        maxDeferTimerRef.current = setTimeout(() => {
            // Time's up — refresh regardless of interaction state.
            doRefresh();
        }, maxDeferMs);
    }, [debounceMs, maxDeferMs, doRefresh, scheduleRefresh]);
    const refreshNow = useCallback(() => {
        doRefresh();
    }, [doRefresh]);
    const cancelQueued = useCallback(() => {
        clearTimers();
        setStatus('idle');
    }, [clearTimers]);
    // Tear down on unmount.
    useEffect(() => clearTimers, [clearTimers]);
    return { status, applyDeployEvent, refreshNow, cancelQueued };
}
/** Optional convenience component. Hosts that want to wire the auto-
 *  refresh logic declaratively can mount this and supply an EventSource
 *  emitting the deploy SSE stream. Hosts that want to manage the timing
 *  imperatively (e.g. with their own EventSource handling) should use
 *  the `useViewerAutoRefresh` hook directly. */
export function ViewerRefreshController(props) {
    const controller = useViewerAutoRefresh(props);
    useEffect(() => {
        if (!props.eventSource)
            return;
        const handler = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                controller.applyDeployEvent(parsed);
            }
            catch { /* ignore malformed events */ }
        };
        props.eventSource.addEventListener('deploy', handler);
        return () => props.eventSource?.removeEventListener('deploy', handler);
    }, [props.eventSource, controller]);
    return props.children ? _jsx(_Fragment, { children: props.children(controller) }) : null;
}
//# sourceMappingURL=ViewerRefreshController.js.map