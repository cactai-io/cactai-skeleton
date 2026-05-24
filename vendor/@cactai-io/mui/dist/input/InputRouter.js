// packages/mui/src/input/InputRouter.ts
// Single input contract boundary. ChatInput never calls the GAS API directly.
// Translates GASInputPayload (MUI-internal) → TurnRequest (API Contract).
//
// Authority: MUI Architecture v0.2 Section 6
// nl_text is the only implemented modality in v1.
// artifact_action, handoff_ack, retry are defined but route-only at v1.
const KNOWN_ERROR_CODES = new Set([
    'internal_error',
    'rate_limited',
    'session_closed',
    'reasoning_failed',
    'turn_limit_exceeded',
    'unauthorized',
]);
function isGasErrorCode(value) {
    return typeof value === 'string' && KNOWN_ERROR_CODES.has(value);
}
export class InputRouter {
    store;
    streamController;
    apiBaseUrl;
    constructor(store, streamController, apiBaseUrl) {
        this.store = store;
        this.streamController = streamController;
        this.apiBaseUrl = apiBaseUrl;
    }
    // Translation path for nl_text (v1 primary path)
    // 1. Read turn_count — becomes TurnRequest.turn_number
    // 2. Increment turn_count
    // 3. Set pending: true
    // 4. Construct TurnRequest
    // 5. POST to /v1/sessions/:session_id/turns
    // 6. Open StreamController against response request_id
    async dispatch(payload) {
        if (payload.input_type !== 'nl_text') {
            // Route-only modalities — queued but not sent in v1
            return;
        }
        // Step 1-2: Read and increment turn count
        const turnNumber = this.store.incrementTurnCount();
        // Step 3: Set pending
        this.store.setPending(true);
        // Step 4: Construct TurnRequest
        const turnRequest = {
            input: payload.content,
            turn_number: turnNumber,
            metadata: {
                input_type: payload.input_type,
                timestamp: payload.timestamp,
            },
        };
        // Step 5: POST to API
        const sessionId = this.store.getState().session.session_id;
        const url = `${this.apiBaseUrl}/v1/sessions/${sessionId}/turns`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(turnRequest),
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                // Narrow the API's error code string to the closed GASErrorCode union.
                // Anything we don't recognize folds to 'internal_error' so the UI has
                // a stable set of cases to handle.
                const code = isGasErrorCode(errBody.code)
                    ? errBody.code
                    : 'internal_error';
                this.store.setPending(false);
                this.store.setActiveError({
                    code,
                    message: errBody.message ?? `Request failed: ${response.status}`,
                    retryable: response.status >= 500,
                    request_id: errBody.request_id,
                    session_id: sessionId,
                });
                return;
            }
            const result = await response.json();
            const requestId = result.request_id;
            // Step 6: Open stream
            if (requestId) {
                this.streamController.connect(requestId);
            }
        }
        catch (err) {
            this.store.setPending(false);
            this.store.setActiveError({
                code: 'internal_error',
                message: err instanceof Error ? err.message : 'Network error',
                retryable: true,
                session_id: sessionId,
            });
        }
    }
}
//# sourceMappingURL=InputRouter.js.map