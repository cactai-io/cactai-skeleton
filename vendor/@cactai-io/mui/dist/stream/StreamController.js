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
    // Open SSE connection for a given request
    connect(requestId) {
        this.disconnect();
        const url = `${this.apiBaseUrl}/v1/outputs/${requestId}/stream`;
        this.eventSource = new EventSource(url);
        this.eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                this.ingest(parsed);
            }
            catch {
                // Malformed event — discard silently per Architecture v0.2
            }
        };
        this.eventSource.onerror = () => {
            // Stream interrupted — surface error
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