// packages/mui/src/store/MUIStore.ts
// Central state for an active MUI session.
// MUI-internal only — never sent to GAS.
// Components derive from MUIStore only. No local copies of GAS data.
//
// Authority: MUI Architecture v0.2 Section 5, Agents Architecture v0.1 Section 7
// State transition rules are locked in Architecture. See inline comments.
export class MUIStore {
    state;
    listeners = new Set();
    deviceContext;
    skillsLibrary = [];
    constructor(session_id, device) {
        this.deviceContext = device;
        this.state = {
            session: {
                session_id,
                turn_count: 0,
            },
            surface: {
                active: 'chat',
                supporting_type: null,
                surface_stack: [],
            },
            conversation: {
                messages: [],
                stream_buffer: [],
                streaming: false,
                pending: false,
            },
            artifacts: {
                registry: {},
            },
            errors: {
                queue: [],
                active: null,
            },
        };
    }
    // Read access
    getState() {
        return this.state;
    }
    getDevice() {
        return this.deviceContext;
    }
    getSkillsLibrary() {
        return this.skillsLibrary;
    }
    // Subscription
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }
    // State transition: InputRouter increments before each dispatch
    // Rule: monotonically increasing per session, never cleared
    incrementTurnCount() {
        const current = this.state.session.turn_count;
        this.state = {
            ...this.state,
            session: { ...this.state.session, turn_count: current + 1 },
        };
        this.notify();
        return current;
    }
    // State transition: true on input dispatch
    // Cleared on first output.delta or turn.error
    setPending(pending) {
        this.state = {
            ...this.state,
            conversation: { ...this.state.conversation, pending },
        };
        this.notify();
    }
    // State transition: true on first output.delta, false on turn.complete
    setStreaming(streaming) {
        this.state = {
            ...this.state,
            conversation: { ...this.state.conversation, streaming },
        };
        this.notify();
    }
    // State transition: appended per output.delta, cleared on turn.complete
    appendStreamDelta(delta) {
        this.state = {
            ...this.state,
            conversation: {
                ...this.state.conversation,
                stream_buffer: [...this.state.conversation.stream_buffer, delta],
            },
        };
        this.notify();
    }
    clearStreamBuffer() {
        this.state = {
            ...this.state,
            conversation: { ...this.state.conversation, stream_buffer: [] },
        };
        this.notify();
    }
    // State transition: appended on turn.complete
    appendMessage(message) {
        this.state = {
            ...this.state,
            conversation: {
                ...this.state.conversation,
                messages: [...this.state.conversation.messages, message],
            },
        };
        this.notify();
    }
    // State transition: written on turn.complete from output.artifacts
    // Persists for session lifetime
    registerArtifact(artifact) {
        this.state = {
            ...this.state,
            artifacts: {
                registry: {
                    ...this.state.artifacts.registry,
                    [artifact.id]: artifact,
                },
            },
        };
        this.notify();
    }
    // State transition: set on turn.error, cleared on onDismiss or onRetry
    setActiveError(error) {
        const queue = error
            ? [...this.state.errors.queue, error]
            : this.state.errors.queue;
        this.state = {
            ...this.state,
            errors: { queue, active: error },
        };
        this.notify();
    }
    // Surface transitions: driven by HandoffSignal receipt
    setActiveSurface(surface) {
        this.state = {
            ...this.state,
            surface: { ...this.state.surface, active: surface },
        };
        this.notify();
    }
    setSupportingType(type) {
        this.state = {
            ...this.state,
            surface: { ...this.state.surface, supporting_type: type },
        };
        this.notify();
    }
    pushSurface(record) {
        this.state = {
            ...this.state,
            surface: {
                ...this.state.surface,
                surface_stack: [...this.state.surface.surface_stack, record],
            },
        };
        this.notify();
    }
    // Device context update (responsive — does not trigger morph)
    updateDevice(device) {
        this.deviceContext = { ...this.deviceContext, ...device };
        this.notify();
    }
    // Skills library — written by SkillAutoRegistrar only
    setSkillsLibrary(skills) {
        this.skillsLibrary = skills;
        this.notify();
    }
}
//# sourceMappingURL=MUIStore.js.map