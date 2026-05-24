'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/surfaces/ChatSurface.tsx
// v1 primary surface. Contains MessageFeed and ChatInput.
// All content flows through MUIStore — no local copies of GAS data.
//
// Authority: MUI Architecture v0.2 Section 3
import React, { useRef, useEffect } from 'react';
import { MessageFeed } from '../components/MessageFeed.js';
import { ChatInput } from '../components/ChatInput.js';
import { PendingIndicator } from '../components/PendingIndicator.js';
import { ErrorDisplay } from '../components/ErrorDisplay.js';
export const ChatSurface = ({ store, theme: t, onSubmit, onRetry, onDismiss, onStop, onRegenerate, onArtifactAction, onSuggestedResponse, suggestedResponses, }) => {
    const feedEndRef = useRef(null);
    const containerRef = useRef(null);
    const isAtBottomRef = useRef(true);
    // Auto-scroll: only if user is near bottom
    useEffect(() => {
        if (isAtBottomRef.current && feedEndRef.current) {
            feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [store.conversation.messages, store.conversation.stream_buffer, store.conversation.pending]);
    const handleScroll = () => {
        if (!containerRef.current)
            return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
    };
    const hasInlineError = store.errors.active &&
        store.errors.active.code === 'turn_limit_exceeded';
    const hasFullError = store.errors.active &&
        store.errors.active.code !== 'turn_limit_exceeded';
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: t.color.background,
            fontFamily: t.typography.fontFamily.base,
            color: t.color.text.primary,
            position: 'relative',
        }, children: [_jsx("div", { ref: containerRef, onScroll: handleScroll, style: {
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: `${t.spacing.scale['6']} ${t.spacing.scale['4']}`,
                    scrollBehavior: 'smooth',
                }, children: _jsxs("div", { style: { maxWidth: '768px', margin: '0 auto', width: '100%' }, children: [_jsx(MessageFeed, { messages: store.conversation.messages, streamBuffer: store.conversation.stream_buffer, streaming: store.conversation.streaming, theme: t, onArtifactAction: onArtifactAction }), store.conversation.pending && (_jsx(PendingIndicator, { pending: true, theme: t })), hasFullError && store.errors.active && (_jsx(ErrorDisplay, { error: store.errors.active, theme: t, onRetry: onRetry, onDismiss: onDismiss })), _jsx("div", { ref: feedEndRef })] }) }), store.conversation.streaming && (_jsx("div", { style: {
                    display: 'flex',
                    justifyContent: 'center',
                    padding: `${t.spacing.scale['2']} 0`,
                    backgroundColor: t.color.background,
                }, children: _jsxs("button", { onClick: onStop, "aria-label": "Stop generating", style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: t.spacing.scale['2'],
                        padding: `${t.spacing.scale['1']} ${t.spacing.scale['4']}`,
                        backgroundColor: t.color.surface,
                        color: t.color.text.secondary,
                        border: `1px solid ${t.color.border}`,
                        borderRadius: t.radii.full,
                        fontSize: t.typography.fontSize.sm,
                        fontFamily: t.typography.fontFamily.base,
                        cursor: 'pointer',
                        transition: t.transitions.fast,
                    }, children: [_jsx("span", { style: {
                                display: 'inline-block',
                                width: '10px',
                                height: '10px',
                                backgroundColor: t.color.text.secondary,
                                borderRadius: '2px',
                            } }), "Stop"] }) })), _jsx("div", { style: {
                    borderTop: `1px solid ${t.color.border}`,
                    backgroundColor: t.color.background,
                    padding: `${t.spacing.scale['3']} ${t.spacing.scale['4']} ${t.spacing.scale['4']}`,
                }, children: _jsxs("div", { style: { maxWidth: '768px', margin: '0 auto', width: '100%' }, children: [suggestedResponses && suggestedResponses.length > 0 && !store.conversation.streaming && !store.conversation.pending && (_jsx(SuggestedResponses, { responses: suggestedResponses, theme: t, onSelect: onSuggestedResponse })), hasInlineError && store.errors.active && (_jsx("div", { role: "alert", style: {
                                padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
                                marginBottom: t.spacing.scale['2'],
                                fontSize: t.typography.fontSize.sm,
                                color: t.color.error,
                                backgroundColor: `${t.color.error}11`,
                                borderRadius: t.radii.sm,
                            }, children: store.errors.active.message })), _jsx(ChatInput, { theme: t, onSubmit: onSubmit, disabled: store.conversation.pending || store.conversation.streaming })] }) })] }));
};
const INITIAL_VISIBLE = 3;
const SuggestedResponses = ({ responses, theme: t, onSelect }) => {
    const [expanded, setExpanded] = React.useState(false);
    const visible = expanded ? responses : responses.slice(0, INITIAL_VISIBLE);
    const hasMore = responses.length > INITIAL_VISIBLE;
    return (_jsxs("div", { style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: t.spacing.scale['2'],
            marginBottom: t.spacing.scale['3'],
        }, children: [visible.map((text, i) => (_jsx("button", { onClick: () => onSelect(text), style: {
                    padding: `${t.spacing.scale['1']} ${t.spacing.scale['3']}`,
                    backgroundColor: t.color.surface,
                    color: t.color.text.secondary,
                    border: `1px solid ${t.color.border}`,
                    borderRadius: t.radii.full,
                    fontSize: t.typography.fontSize.sm,
                    fontFamily: t.typography.fontFamily.base,
                    cursor: 'pointer',
                    transition: t.transitions.fast,
                    whiteSpace: 'nowrap',
                    maxWidth: '280px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }, children: text }, i))), hasMore && !expanded && (_jsxs("button", { onClick: () => setExpanded(true), style: {
                    padding: `${t.spacing.scale['1']} ${t.spacing.scale['3']}`,
                    backgroundColor: 'transparent',
                    color: t.color.primary,
                    border: `1px solid ${t.color.primary}33`,
                    borderRadius: t.radii.full,
                    fontSize: t.typography.fontSize.sm,
                    fontFamily: t.typography.fontFamily.base,
                    cursor: 'pointer',
                    transition: t.transitions.fast,
                }, children: ["+", responses.length - INITIAL_VISIBLE, " more"] }))] }));
};
//# sourceMappingURL=ChatSurface.js.map