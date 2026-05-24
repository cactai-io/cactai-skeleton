import { type ReactNode } from 'react';
import type { JSX } from 'react';
import type { SourceLocation, NoMatchReason } from './inspectProtocol.js';
export interface DevSelection extends SourceLocation {
    /** When this selection was set — drives the brief flash highlight
     *  in the directory viewer's file editor. */
    selected_at: string;
}
export interface SelectionContextValue {
    /** The active selection, or null when nothing is selected. */
    selection: DevSelection | null;
    /** True when the most recent click failed to map to source. Surfaces
     *  the fallback message in the chat. */
    lastNoMatch: {
        reason: NoMatchReason;
        element_tag?: string;
        element_text?: string;
    } | null;
    /** Called by the overlay when the iframe posts a select event. */
    setSelection: (sel: SourceLocation) => void;
    /** Called by the overlay when the iframe posts a no-match event. */
    setNoMatch: (info: {
        reason: NoMatchReason;
        element_tag?: string;
        element_text?: string;
    }) => void;
    /** Explicit dismissal — fired by the chat's "Dismiss selection"
     *  button + the directory viewer's "back to dev" close. */
    dismissSelection: () => void;
    /** Increment the chat-message counter. After AUTO_DISMISS_AFTER
     *  messages without an explicit reference, the selection clears. */
    noteChatMessage: () => void;
}
/** Number of chat messages that can elapse without referencing the
 *  selection before it auto-dismisses. Per spec (Gap 136). */
declare const AUTO_DISMISS_AFTER = 10;
export declare function SelectionContextProvider({ children }: {
    children: ReactNode;
}): JSX.Element;
/** Use the selection context from any component inside the provider. */
export declare function useSelection(): SelectionContextValue;
/** Subscribe to selection changes via callback. Useful for the
 *  directory viewer, which opens the file + scrolls to the line on
 *  every selection event without needing to re-render itself when
 *  the selection clears. */
export declare function useSelectionEffect(handler: (sel: DevSelection) => void): void;
export { AUTO_DISMISS_AFTER };
