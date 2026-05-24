// packages/mui/src/viewer/ClickToSelectOverlay.tsx
// Parent-side click-to-select surface (v1.3 Phase 13, Gap 132 + 137 + 138).
// Composes the toggle button + first-time hint, manages the iframe ↔
// parent postMessage handshake, and forwards events to the
// SelectionContext.
//
// Host responsibility:
//   - Render <ClickToSelectOverlay iframeRef={ref} /> inside the viewer
//     panel above the iframe.
//   - Wrap the consumer tree in <SelectionContextProvider> so the
//     directory viewer + chat input can read the active selection.
//
// Keyboard shortcut: Cmd/Ctrl + Shift + I (matches browser DevTools'
// "Inspect" gesture). Registered when the overlay is mounted; cleaned
// up on unmount.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, } from 'react';
import { useSelection } from './SelectionContext.js';
import { isIframeToParent, isAcceptableOrigin, } from './inspectProtocol.js';
const HINT_SEEN_KEY = 'cactai:devshell:inspect-hint-seen';
export function ClickToSelectOverlay(props) {
    const [enabled, setEnabled] = useState(false);
    const [iframeReady, setIframeReady] = useState(false);
    const [hoverLoc, setHoverLoc] = useState(null);
    const [showHint, setShowHint] = useState(() => {
        if (props.showFirstTimeHint === false)
            return false;
        if (typeof window === 'undefined')
            return false;
        try {
            return localStorage.getItem(HINT_SEEN_KEY) !== '1';
        }
        catch {
            return true;
        }
    });
    const { setSelection, setNoMatch } = useSelection();
    const parentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const postToIframe = useCallback((msg) => {
        const iframe = props.iframeRef.current;
        if (!iframe || !iframe.contentWindow)
            return;
        iframe.contentWindow.postMessage(msg, '*');
    }, [props.iframeRef]);
    // Listen for iframe → parent messages with origin verification.
    useEffect(() => {
        const onMessage = (ev) => {
            if (!isAcceptableOrigin(ev.origin, {
                allowedOrigins: props.allowedOrigins,
                parentOrigin,
            }))
                return;
            if (!isIframeToParent(ev.data))
                return;
            const msg = ev.data;
            switch (msg.type) {
                case 'cactai-inspect:ready':
                    setIframeReady(true);
                    // Re-emit current enable state in case the iframe reloaded
                    // while inspection was already on.
                    if (enabled)
                        postToIframe({ type: 'cactai-inspect:enable' });
                    break;
                case 'cactai-inspect:hover':
                    setHoverLoc(msg.payload);
                    break;
                case 'cactai-inspect:select':
                    setSelection(msg.payload);
                    // Auto-disable inspection after a successful select — the
                    // developer is now editing, not searching. They can re-enable
                    // via the toggle / shortcut to pick another element.
                    setEnabled(false);
                    postToIframe({ type: 'cactai-inspect:disable' });
                    break;
                case 'cactai-inspect:no-match':
                    setNoMatch(msg.payload);
                    break;
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [props.allowedOrigins, parentOrigin, enabled, postToIframe, setSelection, setNoMatch]);
    // Toggle handler — fired by the button + keyboard shortcut.
    const toggle = useCallback(() => {
        setEnabled(prev => {
            const next = !prev;
            postToIframe({ type: next ? 'cactai-inspect:enable' : 'cactai-inspect:disable' });
            if (next && showHint) {
                // Once the developer activates inspection, they've seen the hint.
                try {
                    localStorage.setItem(HINT_SEEN_KEY, '1');
                }
                catch { /* ignore */ }
                setShowHint(false);
            }
            return next;
        });
    }, [postToIframe, showHint]);
    // Keyboard shortcut: Cmd/Ctrl + Shift + I.
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                toggle();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle]);
    const dismissHint = useCallback(() => {
        try {
            localStorage.setItem(HINT_SEEN_KEY, '1');
        }
        catch { /* ignore */ }
        setShowHint(false);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: toggle, disabled: !iframeReady, title: iframeReady ? 'Click to select an element (⌘/Ctrl + Shift + I)' : 'Inspector not available — iframe still loading', "aria-pressed": enabled, style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontFamily: 'var(--f-ui, system-ui)',
                    background: enabled
                        ? 'var(--ds-accent-subtle, #1E1E3A)'
                        : 'var(--ds-surface-2, transparent)',
                    border: `1px solid ${enabled
                        ? 'var(--ds-accent, #5856E5)'
                        : 'var(--ds-border-1, #25253A)'}`,
                    color: enabled
                        ? 'var(--ds-accent, #5856E5)'
                        : 'var(--ds-text-2, #A0A0B8)',
                    borderRadius: 4,
                    cursor: iframeReady ? 'pointer' : 'not-allowed',
                    opacity: iframeReady ? 1 : 0.5,
                    userSelect: 'none',
                }, children: [_jsx("span", { "aria-hidden": true, style: { fontSize: 13, lineHeight: 1 }, children: "\u2316" }), _jsx("span", { children: "Click to select" }), enabled && _jsx("span", { style: { fontSize: 10, opacity: 0.8 }, children: "ON" })] }), enabled && hoverLoc && (_jsxs("div", { role: "status", style: {
                    position: 'fixed',
                    top: 12,
                    right: 12,
                    zIndex: 100000,
                    background: 'var(--ds-surface-1, #15151F)',
                    border: '1px solid var(--ds-accent, #5856E5)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontFamily: 'var(--f-mono, monospace)',
                    color: 'var(--ds-text, #E8E8F0)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    pointerEvents: 'none',
                    maxWidth: 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }, children: [hoverLoc.element_tag, hoverLoc.element_attrs?.id ? `#${hoverLoc.element_attrs.id}` : '', " \u2014 ", hoverLoc.filename, ":", hoverLoc.line] })), showHint && (_jsxs("div", { role: "dialog", "aria-label": "Click-to-select tip", style: {
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100001,
                    background: 'var(--ds-surface-1, #15151F)',
                    border: '1px solid var(--ds-accent, #5856E5)',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontFamily: 'var(--f-ui, system-ui)',
                    color: 'var(--ds-text, #E8E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    maxWidth: 560,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }, children: [_jsx("span", { style: { fontSize: 16 }, "aria-hidden": true, children: "\uD83D\uDCA1" }), _jsxs("span", { style: { flex: 1, lineHeight: 1.4 }, children: [_jsx("strong", { children: "Tip:" }), " Click the inspector icon (or press \u2318/Ctrl + Shift + I) to select any element in your app \u2014 DevShell will open its source file and you can edit it directly or describe changes in chat."] }), _jsx("button", { onClick: dismissHint, style: {
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ds-text-3, #7A7A8E)',
                            cursor: 'pointer',
                            fontSize: 18,
                            lineHeight: 1,
                            padding: 4,
                        }, "aria-label": "Dismiss tip", children: "\u00D7" })] }))] }));
}
//# sourceMappingURL=ClickToSelectOverlay.js.map