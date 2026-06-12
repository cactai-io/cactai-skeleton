'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ResizableDock — the right-edge dock that wraps the decision-log panel (and
// any future right-rail panel). Implements wizard-redesign-2026-06-09:
//   - Drag the left edge to resize (clamped 220..520).
//   - Click ‹ in the header to collapse to a 32px strip with a vertical label;
//     click › to expand.
//   - Both width + collapsed state persist per project in localStorage so the
//     dev's last shape survives reloads.
//
// Used twice in DevShell.tsx — the workspace section dock and the build-view
// dock — so it lives here as a shared component.
import { useCallback, useEffect, useRef, useState } from 'react';
const k = (pid, suffix) => `cactai_ds_${pid}_dock_${suffix}`;
function rN(pid, suffix, fallback) {
    try {
        const v = localStorage.getItem(k(pid, suffix));
        if (v == null)
            return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }
    catch {
        return fallback;
    }
}
function rB(pid, suffix, fallback) {
    try {
        const v = localStorage.getItem(k(pid, suffix));
        return v == null ? fallback : v === 'true';
    }
    catch {
        return fallback;
    }
}
function wS(pid, suffix, v) {
    try {
        localStorage.setItem(k(pid, suffix), String(v));
    }
    catch { /* localStorage unavailable — non-fatal */ }
}
export function ResizableDock({ projectId, label = 'Decisions', defaultWidth = 300, minWidth = 220, maxWidth = 520, children, }) {
    const [collapsed, setCollapsed] = useState(() => rB(projectId, 'collapsed', false));
    const [width, setWidth] = useState(() => {
        const v = rN(projectId, 'width', defaultWidth);
        return Math.max(minWidth, Math.min(maxWidth, v));
    });
    const dragStartRef = useRef(null);
    useEffect(() => { wS(projectId, 'collapsed', collapsed); }, [projectId, collapsed]);
    useEffect(() => { wS(projectId, 'width', width); }, [projectId, width]);
    const onResizeDown = useCallback((e) => {
        e.preventDefault();
        dragStartRef.current = { x: e.clientX, w: width };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMove = (ev) => {
            if (!dragStartRef.current)
                return;
            // dragging LEFT (toward the chat) widens the right dock
            const delta = dragStartRef.current.x - ev.clientX;
            const next = Math.max(minWidth, Math.min(maxWidth, dragStartRef.current.w + delta));
            setWidth(next);
        };
        const onUp = () => {
            dragStartRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [width, minWidth, maxWidth]);
    if (collapsed) {
        return (_jsxs("aside", { style: {
                width: 32, flexShrink: 0, overflow: 'hidden',
                borderLeft: '1px solid var(--ds-border, rgba(255,255,255,0.08))',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: 8,
            }, "aria-label": `${label} (collapsed)`, children: [_jsx("button", { type: "button", onClick: () => setCollapsed(false), title: `Expand ${label.toLowerCase()}`, style: {
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: 4, color: 'var(--ds-text-3, #9A9AAE)', fontSize: 14, lineHeight: 1,
                    }, children: "\u2039" }), _jsx("div", { style: {
                        marginTop: 12, writingMode: 'vertical-rl', textOrientation: 'mixed',
                        fontSize: 10, color: 'var(--ds-text-3, #9A9AAE)',
                        letterSpacing: '0.08em', textTransform: 'uppercase', userSelect: 'none',
                    }, children: label })] }));
    }
    return (_jsxs("aside", { style: {
            width, flexShrink: 0,
            borderLeft: '1px solid var(--ds-border, rgba(255,255,255,0.08))',
            position: 'relative', display: 'flex', flexDirection: 'column',
            minHeight: 0,
        }, "aria-label": label, children: [_jsx("div", { onMouseDown: onResizeDown, style: {
                    position: 'absolute', top: 0, left: -2, bottom: 0, width: 5,
                    cursor: 'col-resize', zIndex: 2,
                }, title: "Drag to resize" }), _jsx("button", { type: "button", onClick: () => setCollapsed(true), title: `Collapse ${label.toLowerCase()}`, style: {
                    position: 'absolute', top: 6, left: 6, zIndex: 3,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: 4, color: 'var(--ds-text-3, #9A9AAE)', fontSize: 14, lineHeight: 1,
                }, children: "\u203A" }), _jsx("div", { style: { flex: 1, minHeight: 0, overflow: 'auto' }, children: children })] }));
}
//# sourceMappingURL=ResizableDock.js.map