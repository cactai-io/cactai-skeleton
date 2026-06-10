// packages/mui/src/stream/StreamController.ts
// Sole consumer of the SSE connection. Components never read the stream directly.
// Connects to GET /v1/outputs/:request_id/stream on turn submission.
//
// Authority: MUI Architecture v0.2 Section 4
// Rules: StreamController is the sole consumer. Components derive from MUIStore.
export class StreamController {
    eventSource = null;
    store;
    apiBaseUrl;
    onHandoff;
    constructor(store, apiBaseUrl, onHandoff) {
        this.store = store;
        this.apiBaseUrl = apiBaseUrl;
        this.onHandoff = onHandoff;
    }
    // Open SSE connection for a given request.
    //
    // 2026-06-10 fix: the server emits NAMED SSE events (`event: turn.started\n
    // data: {...}\n\n`). The browser's `EventSource.onmessage` ONLY fires for
    // UNNAMED events — named events are silently dropped unless you register
    // them via `addEventListener(<type>, ...)`. The previous implementation
    // listened only on `onmessage`, so the stream sat open until the server
    // closed it, and EventSource then auto-reconnected once or fired onerror —
    // which surfaced as "Stream connection interrupted" with no agent reply
    // visible. This is why chat appeared to send but never responded.
    //
    // Server-side, the `data:` JSON is the bare PAYLOAD (e.g. for turn.started
    // it's `{request_id, session_id}`, not a full StreamEvent wrapper). We
    // reconstruct the StreamEvent shape here so the existing ingest() / store
    // wiring keeps working with no downstream changes.
    connect(requestId) {
        this.disconnect();
        const url = `${this.apiBaseUrl}/v1/outputs/${requestId}/stream`;
        this.eventSource = new EventSource(url);
        const completedFlag = { v: false };
        const NAMED = [
            'turn.started', 'reasoning.delta', 'output.delta',
            'tool.invoked', 'handoff.signal', 'turn.complete', 'turn.error',
        ];
        for (const type of NAMED) {
            this.eventSource.addEventListener(type, (rawEvent) => {
                const ev = rawEvent;
                const isTerminal = type === 'turn.complete' || type === 'turn.error';
                if (isTerminal) completedFlag.v = true;
                try {
                    const data = JSON.parse(ev.data);
                    this.ingest({
                        event: type,
                        request_id: (data && data.request_id) ?? requestId,
                        sequence: 0,
                        timestamp: new Date().toISOString(),
                        data,
                    });
                }
                catch (e) {
                    console.error('[StreamController] listener throw:', e);
                }
                if (isTerminal) this.disconnect();
            });
        }
        // Keep onmessage for any unnamed events the server might emit (e.g. SSE
        // keep-alive pings). Treating them as no-ops.
        this.eventSource.onmessage = () => { };
        this.eventSource.onerror = () => {
            // If the stream already completed naturally, the browser fires onerror
            // on the closed source — that is NOT a user-facing failure. Only
            // surface the error when the turn never completed.
            if (completedFlag.v) {
                this.disconnect();
                return;
            }
            this.store.setPending(false);
            this.store.setStreaming(false);
            this.store.setActiveError({
                code: 'internal_error',
                message: 'Stream connection interrupted',
                retryable: true,
            });
            this.disconnect();
        };
    }
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
    // Event dispatch per MUI Architecture v0.2 Section 4
    ingest(event) {
        switch (event.event) {
            case 'turn.started':
                // Stream open confirmed. No MUI state change.
                break;
            case 'reasoning.delta':
                // No-op in v1 chat surface. Discarded intentionally.
                break;
            case 'output.delta':
                this.handleOutputDelta(event);
                break;
            case 'tool.invoked':
                // No-op in v1 chat surface. Discarded intentionally.
                break;
            case 'handoff.signal':
                this.handleHandoffSignal(event);
                break;
            case 'turn.complete':
                this.handleTurnComplete(event);
                break;
            case 'turn.error':
                this.handleTurnError(event);
                break;
            default:
                // Unhandled event type — no-op. Not an error condition.
                break;
        }
    }
    // pending: false on first delta. streaming: true. Buffer appended.
    handleOutputDelta(event) {
        const state = this.store.getState();
        if (state.conversation.pending) {
            this.store.setPending(false);
        }
        if (!state.conversation.streaming) {
            this.store.setStreaming(true);
        }
        this.store.appendStreamDelta({
            sequence: event.sequence,
            delta: event.data.delta,
        });
    }
    // Handoff fires mid-stream before turn.complete
    // MUIShell handles surface activation via callback
    handleHandoffSignal(event) {
        this.onHandoff(event.data.signal);
    }
    // StreamingBubble destroyed. OutputResponse assembled. MessageBubble renders.
    handleTurnComplete(event) {
        this.store.setStreaming(false);
        // Server emits full output in turn.complete with no preceding output.delta,
        // so handleOutputDelta (the only other place clearing pending) never runs.
        this.store.setPending(false);
        this.store.clearStreamBuffer();
        // Assemble OutputResponse from stream data + MUIStore context
        const state = this.store.getState();
        const assembled = {
            request_id: event.request_id,
            session_id: state.session.session_id,
            status: 'complete',
            output: event.data.output,
            completed_at: new Date().toISOString(),
        };
        this.store.appendMessage(assembled);
        // Register artifacts from output
        if (event.data.output?.artifacts) {
            for (const artifact of event.data.output.artifacts) {
                const a = artifact;
                if (a.id) {
                    this.store.registerArtifact(a);
                }
            }
        }
        this.disconnect();
    }
    // pending: false. ErrorDisplay renders.
    handleTurnError(event) {
        this.store.setPending(false);
        this.store.setStreaming(false);
        this.store.setActiveError(event.data.error);
        this.disconnect();
    }
}
//# sourceMappingURL=StreamController.js.map