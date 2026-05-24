// packages/mui/src/viewer/SelectionContext.tsx
// React context provider for the active click-to-select selection
// (v1.3 Phase 13, Gap 133). Selection state lives in DevShell — the
// viewer overlay updates it on each iframe selection event, the
// directory viewer subscribes to open the source file, the chat input
// subscribes to ground messages, and an auto-dismiss counter (Gap 136)
// clears the selection after 10 messages without referencing it.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useRef, useEffect, } from 'react';
const SelectionCtx = createContext(null);
/** Number of chat messages that can elapse without referencing the
 *  selection before it auto-dismisses. Per spec (Gap 136). */
const AUTO_DISMISS_AFTER = 10;
export function SelectionContextProvider({ children }) {
    const [selection, setSelectionState] = useState(null);
    const [lastNoMatch, setLastNoMatch] = useState(null);
    // Use a ref for the message-count so it doesn't trigger rerenders.
    const messageCount = useRef(0);
    const setSelection = useCallback((sel) => {
        setSelectionState({
            ...sel,
            selected_at: new Date().toISOString(),
        });
        setLastNoMatch(null);
        messageCount.current = 0;
    }, []);
    const setNoMatch = useCallback((info) => {
        setLastNoMatch(info);
        // No-match doesn't replace an existing successful selection — it
        // surfaces alongside as a "this click didn't map to source" hint.
    }, []);
    const dismissSelection = useCallback(() => {
        setSelectionState(null);
        setLastNoMatch(null);
        messageCount.current = 0;
    }, []);
    const noteChatMessage = useCallback(() => {
        if (selection === null)
            return;
        messageCount.current += 1;
        if (messageCount.current >= AUTO_DISMISS_AFTER) {
            // 10-message timer expired; auto-dismiss.
            setSelectionState(null);
            messageCount.current = 0;
        }
    }, [selection]);
    // Reset the counter when a new selection lands.
    useEffect(() => {
        messageCount.current = 0;
    }, [selection?.filename, selection?.line, selection?.column]);
    return (_jsx(SelectionCtx.Provider, { value: {
            selection,
            lastNoMatch,
            setSelection,
            setNoMatch,
            dismissSelection,
            noteChatMessage,
        }, children: children }));
}
/** Use the selection context from any component inside the provider. */
export function useSelection() {
    const ctx = useContext(SelectionCtx);
    if (!ctx) {
        throw new Error('useSelection must be inside <SelectionContextProvider>');
    }
    return ctx;
}
/** Subscribe to selection changes via callback. Useful for the
 *  directory viewer, which opens the file + scrolls to the line on
 *  every selection event without needing to re-render itself when
 *  the selection clears. */
export function useSelectionEffect(handler) {
    const { selection } = useSelection();
    useEffect(() => {
        if (selection)
            handler(selection);
        // Intentionally re-run on every selection change including the
        // selected_at timestamp — that's how the consumer detects a fresh
        // selection of the same file/line as a "select again" event.
    }, [selection, handler]);
}
export { AUTO_DISMISS_AFTER };
//# sourceMappingURL=SelectionContext.js.map