'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/renderers/TextRenderer.tsx
// Markdown/plain text renderer. Converts markdown to React elements via react-markdown.
// Security: No innerHTML, no dangerouslySetInnerHTML. React's JSX auto-escapes.
// This is the primary text rendering path for all streamed and finalized content.
//
// Authority: MUI Architecture v0.2 Section 3
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export const TextRenderer = ({ content, theme: t }) => {
    const components = useMemo(() => buildComponents(t), [t]);
    return (_jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: components, children: content }));
};
function buildComponents(t) {
    return {
        p: ({ children }) => (_jsx("p", { style: {
                margin: `${t.spacing.scale['2']} 0`,
                lineHeight: t.typography.lineHeight.relaxed,
            }, children: children })),
        h1: ({ children }) => (_jsx("h1", { style: {
                fontSize: t.typography.fontSize['2xl'],
                fontWeight: t.typography.fontWeight.bold,
                margin: `${t.spacing.scale['4']} 0 ${t.spacing.scale['2']}`,
                lineHeight: t.typography.lineHeight.tight,
            }, children: children })),
        h2: ({ children }) => (_jsx("h2", { style: {
                fontSize: t.typography.fontSize.xl,
                fontWeight: t.typography.fontWeight.semibold,
                margin: `${t.spacing.scale['4']} 0 ${t.spacing.scale['2']}`,
                lineHeight: t.typography.lineHeight.tight,
            }, children: children })),
        h3: ({ children }) => (_jsx("h3", { style: {
                fontSize: t.typography.fontSize.lg,
                fontWeight: t.typography.fontWeight.semibold,
                margin: `${t.spacing.scale['3']} 0 ${t.spacing.scale['1']}`,
                lineHeight: t.typography.lineHeight.tight,
            }, children: children })),
        a: ({ href, children }) => (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", style: {
                color: t.color.primary,
                textDecoration: 'none',
                borderBottom: `1px solid ${t.color.primary}44`,
                transition: t.transitions.fast,
            }, children: children })),
        ul: ({ children }) => (_jsx("ul", { style: {
                margin: `${t.spacing.scale['2']} 0`,
                paddingLeft: t.spacing.scale['5'],
                lineHeight: t.typography.lineHeight.relaxed,
            }, children: children })),
        ol: ({ children }) => (_jsx("ol", { style: {
                margin: `${t.spacing.scale['2']} 0`,
                paddingLeft: t.spacing.scale['5'],
                lineHeight: t.typography.lineHeight.relaxed,
            }, children: children })),
        li: ({ children }) => (_jsx("li", { style: {
                marginBottom: t.spacing.scale['1'],
            }, children: children })),
        blockquote: ({ children }) => (_jsx("blockquote", { style: {
                margin: `${t.spacing.scale['3']} 0`,
                padding: `${t.spacing.scale['2']} ${t.spacing.scale['4']}`,
                borderLeft: `3px solid ${t.color.primary}66`,
                backgroundColor: `${t.color.primary}08`,
                borderRadius: `0 ${t.radii.sm} ${t.radii.sm} 0`,
                color: t.color.text.secondary,
            }, children: children })),
        code: ({ inline, className, children }) => {
            if (inline) {
                return (_jsx("code", { style: {
                        padding: `1px ${t.spacing.scale['1']}`,
                        backgroundColor: `${t.color.text.primary}0D`,
                        borderRadius: t.radii.sm,
                        fontFamily: t.typography.fontFamily.mono,
                        fontSize: '0.9em',
                    }, children: children }));
            }
            // Extract language from className (e.g., "language-javascript")
            const language = className?.replace('language-', '') ?? '';
            return (_jsxs("div", { style: {
                    position: 'relative',
                    margin: `${t.spacing.scale['3']} 0`,
                }, children: [language && (_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: `${t.spacing.scale['1']} ${t.spacing.scale['3']}`,
                            backgroundColor: `${t.color.text.primary}0A`,
                            borderRadius: `${t.radii.md} ${t.radii.md} 0 0`,
                            borderBottom: `1px solid ${t.color.border}`,
                        }, children: [_jsx("span", { style: {
                                    fontSize: t.typography.fontSize.xs,
                                    color: t.color.text.disabled,
                                    fontFamily: t.typography.fontFamily.mono,
                                    textTransform: 'uppercase',
                                    letterSpacing: t.typography.letterSpacing.wide,
                                }, children: language }), _jsx("button", { onClick: () => {
                                    const text = String(children).replace(/\n$/, '');
                                    navigator.clipboard.writeText(text).catch(() => { });
                                }, style: {
                                    padding: `2px ${t.spacing.scale['2']}`,
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: t.radii.sm,
                                    color: t.color.text.disabled,
                                    fontSize: t.typography.fontSize.xs,
                                    fontFamily: t.typography.fontFamily.base,
                                    cursor: 'pointer',
                                    transition: t.transitions.fast,
                                }, children: "Copy" })] })), _jsx("pre", { style: {
                            margin: 0,
                            padding: t.spacing.scale['3'],
                            backgroundColor: `${t.color.text.primary}08`,
                            borderRadius: language ? `0 0 ${t.radii.md} ${t.radii.md}` : t.radii.md,
                            overflow: 'auto',
                        }, children: _jsx("code", { style: {
                                fontFamily: t.typography.fontFamily.mono,
                                fontSize: t.typography.fontSize.sm,
                                lineHeight: t.typography.lineHeight.relaxed,
                                color: t.color.text.primary,
                            }, children: children }) })] }));
        },
        table: ({ children }) => (_jsx("div", { style: {
                overflowX: 'auto',
                margin: `${t.spacing.scale['3']} 0`,
                borderRadius: t.radii.md,
                border: `1px solid ${t.color.border}`,
            }, children: _jsx("table", { style: {
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: t.typography.fontSize.sm,
                }, children: children }) })),
        th: ({ children }) => (_jsx("th", { style: {
                padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
                textAlign: 'left',
                fontWeight: t.typography.fontWeight.semibold,
                backgroundColor: `${t.color.text.primary}06`,
                borderBottom: `1px solid ${t.color.border}`,
                fontSize: t.typography.fontSize.xs,
                color: t.color.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: t.typography.letterSpacing.wide,
            }, children: children })),
        td: ({ children }) => (_jsx("td", { style: {
                padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
                borderBottom: `1px solid ${t.color.border}`,
            }, children: children })),
        hr: () => (_jsx("hr", { style: {
                border: 'none',
                borderTop: `1px solid ${t.color.border}`,
                margin: `${t.spacing.scale['4']} 0`,
            } })),
        img: ({ src, alt }) => (_jsx("img", { src: src, alt: alt ?? '', loading: "lazy", style: {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: t.radii.md,
                margin: `${t.spacing.scale['2']} 0`,
            } })),
        strong: ({ children }) => (_jsx("strong", { style: { fontWeight: t.typography.fontWeight.semibold }, children: children })),
        em: ({ children }) => (_jsx("em", { children: children })),
    };
}
//# sourceMappingURL=TextRenderer.js.map