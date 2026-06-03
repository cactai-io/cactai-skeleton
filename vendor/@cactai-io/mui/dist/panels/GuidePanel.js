import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/GuidePanel.tsx
//
// The shared ⓘ-guide surface. One component renders the contextual help for
// every DevShell surface (workspace, file directory, configuration, database,
// pending-edits modal). It is a dumb renderer: the host fetches platform-
// authored GuideContent from the API and hands it down, so copy edits ship via
// a single platform deploy and reach every customer app on the next request —
// nothing is baked into the shell bundle.
//
// Placement is the HOST's job. GuidePanel fills its container with
// position:absolute/inset:0 and slides in from the edge named by `origin`. The
// host renders it into the container that origin targets:
//   top         → chat slot (workspace guide drops down)
//   right       → chat slot (configuration / database slide right-to-left in)
//   bottom      → files panel (file directory rises up)
//   modal-split → a modal body (drops from under the modal header)
//
// Generalized from OnboardingModal's docked mode — the workspace ⓘ now routes
// here so the same slide/close/typography vocabulary is shared across surfaces.
import React from 'react';
// Each origin slides from the edge it is named after — and slides back out the
// same edge on close, so dismissing isn't a jarring instant disappear. Keyframe
// names are unique so multiple guide panels (chat + files) can animate
// independently without the browser deduping a shared @keyframes mid-flight.
const ANIM = {
    top: {
        name: 'ds-guide-in-top',
        outName: 'ds-guide-out-top',
        keyframes: `@keyframes ds-guide-in-top { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                @keyframes ds-guide-out-top { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-100%); opacity: 0 } }`,
    },
    bottom: {
        name: 'ds-guide-in-bottom',
        outName: 'ds-guide-out-bottom',
        keyframes: `@keyframes ds-guide-in-bottom { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                @keyframes ds-guide-out-bottom { from { transform: translateY(0); opacity: 1 } to { transform: translateY(100%); opacity: 0 } }`,
    },
    right: {
        name: 'ds-guide-in-right',
        outName: 'ds-guide-out-right',
        keyframes: `@keyframes ds-guide-in-right { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
                @keyframes ds-guide-out-right { from { transform: translateX(0); opacity: 1 } to { transform: translateX(100%); opacity: 0 } }`,
    },
    'modal-split': {
        name: 'ds-guide-in-split',
        outName: 'ds-guide-out-split',
        keyframes: `@keyframes ds-guide-in-split { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                @keyframes ds-guide-out-split { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-100%); opacity: 0 } }`,
    },
};
// The close glyph points back the way the panel came in, so dismissing reads as
// "send it back where it emerged from."
const CLOSE_GLYPH = {
    top: '⌃',
    bottom: '⌄',
    right: '›',
    'modal-split': '⌃',
};
function Spans({ spans }) {
    return (_jsx(_Fragment, { children: spans.map((s, i) => {
            if (s.code)
                return _jsx("code", { children: s.text }, i);
            if (s.bold)
                return _jsx("strong", { children: s.text }, i);
            return _jsx(React.Fragment, { children: s.text }, i);
        }) }));
}
function Block({ block }) {
    switch (block.kind) {
        case 'h2':
            return _jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 12 }, children: block.text });
        case 'h3':
            return _jsx("h3", { style: { fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 8 }, children: block.text });
        case 'p':
            return _jsx("p", { style: { marginTop: 0, marginBottom: 12 }, children: _jsx(Spans, { spans: block.spans }) });
        case 'ol':
            return (_jsx("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: block.items.map((item, i) => _jsx("li", { style: { marginBottom: 12 }, children: _jsx(Spans, { spans: item }) }, i)) }));
        case 'ul':
            return (_jsx("ul", { style: { paddingLeft: 22, marginTop: 8 }, children: block.items.map((item, i) => _jsx("li", { style: { marginBottom: 8 }, children: _jsx(Spans, { spans: item }) }, i)) }));
        case 'callout': {
            const color = block.variant === 'warning' ? 'var(--c-warning, #FFB44D)' : 'var(--c-accent, #5fb6ff)';
            return (_jsx("p", { style: {
                    marginTop: 16, padding: 12,
                    border: `1px solid ${color}`,
                    borderRadius: 6,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    fontSize: 13,
                }, children: _jsx(Spans, { spans: block.spans }) }));
        }
    }
}
export function GuidePanel({ open, onClose, origin, title, blocks, loading }) {
    const anim = ANIM[origin];
    // When `open` flips to false the host keeps us mounted for the exit window,
    // so instead of returning null we play the matching slide-OUT (filling
    // 'forwards' so the panel stays off-edge until the host unmounts it).
    const animation = open
        ? `${anim.name} 240ms cubic-bezier(0.22, 1, 0.36, 1)`
        : `${anim.outName} 200ms cubic-bezier(0.4, 0, 1, 1) forwards`;
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: anim.keyframes }), _jsxs("div", { role: "dialog", "aria-modal": "false", "aria-label": title, style: {
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    background: 'var(--ds-surface)',
                    borderRight: origin === 'right' ? undefined : '1px solid var(--ds-border-soft, rgba(255,255,255,0.06))',
                    borderLeft: origin === 'right' ? '1px solid var(--ds-border-soft, rgba(255,255,255,0.06))' : undefined,
                    color: 'var(--ds-text)',
                    animation,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto',
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--ds-border-soft, rgba(255,255,255,0.06))',
                            flexShrink: 0,
                        }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: title }), _jsx("button", { onClick: onClose, "aria-label": "Close guide", title: "Close guide", style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--ds-text-2)',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                    lineHeight: 1,
                                    padding: '2px 6px',
                                }, children: CLOSE_GLYPH[origin] })] }), _jsx("div", { style: { padding: '20px 24px', flex: 1, fontSize: 14, lineHeight: 1.65 }, children: loading ? (_jsx("div", { "aria-hidden": true, style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [80, 100, 92].map((w, i) => (_jsx("div", { style: {
                                    height: 12, width: `${w}%`, borderRadius: 4,
                                    background: 'var(--ds-surface-2, rgba(255,255,255,0.05))',
                                } }, i))) })) : (blocks.map((b, i) => _jsx(Block, { block: b }, i))) })] })] }));
}
//# sourceMappingURL=GuidePanel.js.map