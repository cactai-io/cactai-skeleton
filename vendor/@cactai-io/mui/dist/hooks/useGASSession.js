'use client';
// packages/mui/src/hooks/useGASSession.ts
// Session binding hook. Provides session context to components.
//
// Authority: MUI Architecture v0.2 Section 5
import { useMemo } from 'react';
import { useMUIStore } from './useMUIStore.js';
export function useGASSession(store) {
    const state = useMUIStore(store);
    return useMemo(() => ({
        session_id: state.session.session_id,
        turn_count: state.session.turn_count,
        morph_state: state.surface.active,
        pending: state.conversation.pending,
        streaming: state.conversation.streaming,
        hasError: state.errors.active !== null,
        messageCount: state.conversation.messages.length,
    }), [state]);
}
//# sourceMappingURL=useGASSession.js.map