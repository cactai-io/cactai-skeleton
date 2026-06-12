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
    // Per-session identity captured at MUIShell construction; threaded
    // into every turn POST so the platform's submitTurnSchema (which
    // requires user_id) is satisfied without forcing the proxy to
    // re-derive identity per request.
    endUserId;
    // Resolved at dispatch time, not bound at construction — the developer can
    // switch personality from the DevShell Preferences modal mid-session, so we
    // pull a fresh value from the host each turn rather than capturing once.
    personalityIdProvider;
    constructor(store, streamController, apiBaseUrl, endUserId, personalityIdProvider) {
        this.store = store;
        this.streamController = streamController;
        this.apiBaseUrl = apiBaseUrl;
        this.endUserId = endUserId;
        this.personalityIdProvider = personalityIdProvider;
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
        // Clear any prior turn error as the developer retries/sends anew.
        this.store.setActiveError(null);
        // Step 1-2: Read and increment turn count
        const turnNumber = this.store.incrementTurnCount();
        // Step 3: Set pending
        this.store.setPending(true);
        // Step 4: Construct TurnRequest. The platform's submitTurnSchema
        // requires user_id (developer identity, threaded into executeTurn
        // for tenant/role scoping + per-user embedding context). The
        // /api/cactai proxy injects provider + model_api_key from the
        // wizard's BYOK secret, but it doesn't know the developer's
        // identity — that's our responsibility.
        // submitTurnSchema requires `user_id` as a string (z.string(), no min).
        // If endUserId is undefined the proxy will forward a body missing user_id
        // and the platform 400s with invalid_body — the chat appears broken with
        // no actionable error. Always attach a string so schema validation
        // passes; the platform tolerates empty user_id for unauthenticated
        // surfaces. A console warn flags the misconfig for the developer.
        if (!this.endUserId) {
            console.warn('[InputRouter] end_user_id missing — chat turn will submit with empty user_id. Check the DevShell mount wiring.');
        }
        const personalityId = this.personalityIdProvider?.() ?? null;
        const turnRequest = {
            input: payload.content,
            turn_number: turnNumber,
            ...(personalityId ? { personality_id: personalityId } : {}),
            metadata: {
                input_type: payload.input_type,
                timestamp: payload.timestamp,
            },
            user_id: this.endUserId ?? '',
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
                // The platform reports `code`; the skeleton /api/cactai proxy reports
                // `error`. Narrow either to the closed GASErrorCode union; anything we
                // don't recognize folds to 'internal_error'.
                const rawCode = errBody.code ?? errBody.error;
                const code = isGasErrorCode(rawCode) ? rawCode : 'internal_error';
                // 412 no_provider_configured = the proxy found no AI key in the app's
                // BYOK store, so the turn never reached the model. Surface an
                // actionable message instead of a generic "Request failed: 412".
                const message = rawCode === 'no_provider_configured'
                    ? (errBody.detail ?? 'No AI provider key is configured for this app. The keys collected in the wizard aren’t reaching the app — re-run setup (Retry bootstrap on the project page) or re-check the project’s BYOK seed, then try again.')
                    : (errBody.message ?? errBody.detail ?? `Request failed: ${response.status}`);
                this.store.setPending(false);
                this.store.setActiveError({
                    code,
                    message,
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