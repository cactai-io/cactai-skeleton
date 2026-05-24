'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/components/StreamingBubble.tsx
// Live output.delta buffer. Token-by-token rendering with markdown parsing.
// Destroyed and replaced by MessageBubble on turn.complete.
//
// Authority: MUI Architecture v0.2 Section 3, 4
import { useMemo } from 'react';
import { TextRenderer } from '../renderers/TextRenderer.js';
export const StreamingBubble = ({ buffer, theme: t, }) => {
    // Assemble buffer into continuous text, ordered by sequence
    const text = useMemo(() => {
        return buffer
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map(d => d.delta)
            .join('');
    }, [buffer]);
    return (_jsxs("div", { "aria-live": "polite", "aria-atomic": false, style: {
            fontSize: t.typography.fontSize.md,
            lineHeight: t.typography.lineHeight.relaxed,
            color: t.color.text.primary,
            position: 'relative',
        }, children: [_jsx(TextRenderer, { content: text, theme: t }), _jsx("span", { "aria-hidden": "true", style: {
                    display: 'inline-block',
                    width: '2px',
                    height: '1.1em',
                    backgroundColor: t.color.primary,
                    marginLeft: '2px',
                    verticalAlign: 'text-bottom',
                    animation: 'mui-cursor-blink 1s step-end infinite',
                } }), _jsx("style", { children: `
        @keyframes mui-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      ` })] }));
};
//# sourceMappingURL=StreamingBubble.js.map