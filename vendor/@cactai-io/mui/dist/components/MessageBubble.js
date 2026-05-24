import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TextRenderer } from '../renderers/TextRenderer.js';
import { ArtifactCard } from './ArtifactCard.js';
export const MessageBubble = ({ message, theme: t, onArtifactAction, }) => {
    const hasText = message.output?.text && message.output.text.trim().length > 0;
    const artifacts = (message.output?.artifacts ?? []);
    // Detect if this is a carried-forward artifact (reused from a prior turn).
    const isCarriedForward = message._carried_forward === true;
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: t.spacing.scale['3'],
            position: 'relative',
        }, children: [isCarriedForward && (_jsx("div", { style: {
                    fontSize: t.typography.fontSize.xs,
                    color: t.color.text.disabled,
                    fontStyle: 'italic',
                    paddingLeft: t.spacing.scale['1'],
                }, children: "Carried forward from previous work" })), hasText && (_jsx("div", { style: {
                    fontSize: t.typography.fontSize.md,
                    lineHeight: t.typography.lineHeight.relaxed,
                    color: t.color.text.primary,
                }, children: _jsx(TextRenderer, { content: message.output?.text ?? '', theme: t }) })), artifacts.length > 0 && (_jsx("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: t.spacing.scale['3'],
                }, children: artifacts.map((artifact) => (_jsx(ArtifactCard, { artifact: artifact, theme: t, onArtifactAction: onArtifactAction }, artifact.id))) })), _jsx("div", { className: "msg-actions", style: {
                    display: 'flex',
                    gap: t.spacing.scale['1'],
                    opacity: 0,
                    transition: t.transitions.fast,
                    marginTop: t.spacing.scale['1'],
                }, children: _jsx(ActionButton, { label: "Copy", icon: copyIcon, theme: t, onClick: () => {
                        if (message.output?.text) {
                            navigator.clipboard.writeText(message.output.text).catch(() => { });
                        }
                    } }) })] }));
};
const ActionButton = ({ label, icon, theme: t, onClick }) => (_jsx("button", { onClick: onClick, "aria-label": label, title: label, style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: t.radii.sm,
        color: t.color.text.disabled,
        cursor: 'pointer',
        transition: t.transitions.fast,
        padding: 0,
    }, dangerouslySetInnerHTML: { __html: icon } }));
const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
//# sourceMappingURL=MessageBubble.js.map