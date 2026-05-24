'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/components/ErrorDisplay.tsx
// Error display for recoverable errors. Renders inline in the chat thread.
// Never full-screen. Never clears conversation. Never shows error codes.
// Session recovery is handled by MUIShell transparently — the user sees
// "Reconnecting..." and then the thread continues.
//
// Goal-blocking errors are GAS's domain — GAS emits them as normal chat
// responses with action options. MUI renders them via MessageBubble.
//
// This component handles transport-level and session errors only.
//
// Authority: MUI Architecture v0.2 Section 8
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens.
import { useState, useEffect, useRef } from 'react';
// Auto-retry config
const MAX_AUTO_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
export const ErrorDisplay = ({ error, theme: t, onRetry, onDismiss, }) => {
    const [autoRetryCount, setAutoRetryCount] = useState(0);
    const [retrying, setRetrying] = useState(false);
    // React 19: useRef<T>() must be invoked with an explicit initial value.
    const timerRef = useRef(undefined);
    // Auto-retry with exponential backoff for retryable errors
    useEffect(() => {
        if (!error.retryable)
            return;
        if (autoRetryCount >= MAX_AUTO_RETRIES)
            return;
        const delay = BACKOFF_BASE_MS * Math.pow(2, autoRetryCount);
        setRetrying(true);
        timerRef.current = setTimeout(() => {
            setAutoRetryCount(prev => prev + 1);
            onRetry();
        }, delay);
        return () => {
            if (timerRef.current)
                clearTimeout(timerRef.current);
        };
    }, [error.retryable, autoRetryCount, onRetry]);
    // Auto-retrying — show minimal indicator
    if (retrying && autoRetryCount < MAX_AUTO_RETRIES) {
        return (_jsxs("div", { role: "status", "aria-live": "polite", style: {
                display: 'flex',
                alignItems: 'center',
                gap: t.spacing.scale['2'],
                padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
                color: t.color.text.disabled,
                fontSize: t.typography.fontSize.sm,
            }, children: [_jsx("span", { style: {
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        border: `2px solid ${t.color.text.disabled}`,
                        borderTopColor: 'transparent',
                        borderRadius: t.radii.full,
                        animation: 'mui-spin 0.8s linear infinite',
                    } }), "Working on it...", _jsx("style", { children: `@keyframes mui-spin { to { transform: rotate(360deg); } }` })] }));
    }
    // Session-ending errors — inline card preserving conversation
    const isSessionError = error.code === 'session_closed' || error.code === 'reasoning_failed';
    if (isSessionError) {
        return (_jsxs("div", { role: "alert", style: {
                padding: t.spacing.scale['4'],
                backgroundColor: t.color.surface,
                border: `1px solid ${t.color.border}`,
                borderRadius: t.radii.md,
                marginTop: t.spacing.scale['2'],
            }, children: [_jsx("div", { style: {
                        fontSize: t.typography.fontSize.sm,
                        color: t.color.text.primary,
                        marginBottom: t.spacing.scale['3'],
                        lineHeight: t.typography.lineHeight.normal,
                    }, children: getReadableMessage(error) }), _jsx("div", { style: {
                        fontSize: t.typography.fontSize.xs,
                        color: t.color.text.disabled,
                        marginBottom: t.spacing.scale['3'],
                    }, children: "Your conversation and progress have been preserved." }), _jsxs("div", { style: { display: 'flex', gap: t.spacing.scale['2'] }, children: [_jsx("button", { onClick: onRetry, style: {
                                padding: `${t.spacing.scale['2']} ${t.spacing.scale['4']}`,
                                backgroundColor: t.color.primary,
                                color: 'var(--c-surface)',
                                border: 'none',
                                borderRadius: t.radii.sm,
                                fontSize: t.typography.fontSize.sm,
                                fontFamily: t.typography.fontFamily.base,
                                fontWeight: t.typography.fontWeight.medium,
                                cursor: 'pointer',
                                transition: t.transitions.fast,
                            }, children: "Try Again" }), _jsx("button", { onClick: onDismiss, style: {
                                padding: `${t.spacing.scale['2']} ${t.spacing.scale['4']}`,
                                backgroundColor: 'transparent',
                                color: t.color.text.secondary,
                                border: `1px solid ${t.color.border}`,
                                borderRadius: t.radii.sm,
                                fontSize: t.typography.fontSize.sm,
                                fontFamily: t.typography.fontFamily.base,
                                cursor: 'pointer',
                                transition: t.transitions.fast,
                            }, children: "Dismiss" })] })] }));
    }
    // Recoverable errors after auto-retry exhaustion — slim inline banner
    return (_jsxs("div", { role: "alert", style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']}`,
            backgroundColor: `${t.color.error}11`,
            borderRadius: t.radii.sm,
            marginTop: t.spacing.scale['2'],
        }, children: [_jsx("span", { style: {
                    fontSize: t.typography.fontSize.sm,
                    color: t.color.text.secondary,
                }, children: getReadableMessage(error) }), _jsx("button", { onClick: () => {
                    setAutoRetryCount(0);
                    setRetrying(false);
                    onRetry();
                }, style: {
                    padding: `${t.spacing.scale['1']} ${t.spacing.scale['3']}`,
                    backgroundColor: 'transparent',
                    color: t.color.primary,
                    border: `1px solid ${t.color.primary}44`,
                    borderRadius: t.radii.sm,
                    fontSize: t.typography.fontSize.sm,
                    fontFamily: t.typography.fontFamily.base,
                    cursor: 'pointer',
                    transition: t.transitions.fast,
                    flexShrink: 0,
                    marginLeft: t.spacing.scale['3'],
                }, children: "Retry" })] }));
};
// Plain-language error messages. Never expose error codes to users.
function getReadableMessage(error) {
    switch (error.code) {
        case 'internal_error':
            return 'Something went wrong. Let\'s try that again.';
        case 'rate_limited':
            return 'Taking a brief pause. Trying again shortly.';
        case 'session_closed':
            return 'The session needs to restart. Rebooting now — all your progress is safe.';
        case 'reasoning_failed':
            return 'Ran into a problem processing that. Let\'s try a different approach.';
        case 'turn_limit_exceeded':
            return 'This conversation is getting long. Consider starting a focused follow-up.';
        case 'unauthorized':
            return 'There\'s an authentication issue. Please check your connection.';
        default:
            return error.message || 'Something unexpected happened.';
    }
}
//# sourceMappingURL=ErrorDisplay.js.map