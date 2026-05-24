'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/components/ArtifactCard.tsx
// Artifact object renderer. Routes artifact to appropriate Skill or sandbox.
// Tier 1 (configured Skills): render inline in React tree.
// Tier 2 (generated code): render in sandboxed iframe.
// Presentation determined by GAS — MUI renders faithfully.
//
// Authority: MUI Architecture v0.2 Section 3, 9
import { useRef, useEffect } from 'react';
import { createSandboxedFrame, generateNonce, themeToCSS, validateEscalation, } from '../security/SecurityLayer.js';
export const ArtifactCard = ({ artifact, theme: t, onArtifactAction, renderedComponent, generatedCode, }) => {
    const iframeContainerRef = useRef(null);
    // Listen for postMessage from sandboxed iframe
    useEffect(() => {
        if (!generatedCode)
            return;
        const handler = (event) => {
            if (!event.data || typeof event.data !== 'object')
                return;
            if (event.data.type === 'mui_escalate') {
                const validated = validateEscalation(event.data.data);
                if (validated) {
                    onArtifactAction(artifact.id, JSON.stringify(validated));
                }
            }
            if (event.data.type === 'mui_render_error') {
                // Render error from sandboxed code — surface as error state
                console.error('Tier 2 render error:', event.data.error);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [generatedCode, artifact.id, onArtifactAction]);
    // Mount sandboxed iframe for Tier 2 generated code
    useEffect(() => {
        if (!generatedCode || !iframeContainerRef.current)
            return;
        const container = iframeContainerRef.current;
        container.innerHTML = '';
        const nonce = generateNonce();
        const css = themeToCSS(t);
        const frame = createSandboxedFrame(generatedCode, css, nonce);
        container.appendChild(frame);
        return () => {
            container.innerHTML = '';
        };
    }, [generatedCode, t]);
    return (_jsxs("div", { role: "article", "aria-label": `Artifact: ${artifact.type ?? 'content'}`, style: {
            backgroundColor: t.color.surface,
            border: `1px solid ${t.color.border}`,
            borderRadius: t.radii.md,
            overflow: 'hidden',
            transition: t.transitions.fast,
        }, children: [renderedComponent && (_jsx("div", { style: { padding: t.spacing.scale['4'] }, children: renderedComponent })), generatedCode && !renderedComponent && (_jsx("div", { ref: iframeContainerRef, style: {
                    width: '100%',
                    minHeight: '200px',
                    position: 'relative',
                } })), !renderedComponent && !generatedCode && (_jsxs("div", { style: {
                    padding: t.spacing.scale['4'],
                    color: t.color.text.secondary,
                    fontSize: t.typography.fontSize.sm,
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: t.spacing.scale['2'],
                            marginBottom: t.spacing.scale['2'],
                        }, children: [_jsx("span", { style: {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: `${t.color.primary}22`,
                                    borderRadius: t.radii.sm,
                                    fontSize: t.typography.fontSize.xs,
                                    color: t.color.primary,
                                }, children: "\u25C6" }), _jsx("span", { style: { fontWeight: t.typography.fontWeight.medium, color: t.color.text.primary }, children: artifact.type ?? 'Artifact' })] }), typeof artifact['title'] === 'string' && (_jsx("div", { style: { color: t.color.text.primary, marginBottom: t.spacing.scale['1'] }, children: artifact['title'] }))] })), _jsx("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: t.spacing.scale['1'],
                    padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
                    borderTop: `1px solid ${t.color.border}`,
                }, children: _jsx(ArtifactAction, { label: "Report issue", theme: t, onClick: () => onArtifactAction(artifact.id, 'report') }) })] }));
};
const ArtifactAction = ({ label, theme: t, onClick }) => (_jsx("button", { onClick: onClick, style: {
        padding: `${t.spacing.scale['1']} ${t.spacing.scale['2']}`,
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: t.radii.sm,
        color: t.color.text.disabled,
        fontSize: t.typography.fontSize.xs,
        fontFamily: t.typography.fontFamily.base,
        cursor: 'pointer',
        transition: t.transitions.fast,
    }, children: label }));
//# sourceMappingURL=ArtifactCard.js.map