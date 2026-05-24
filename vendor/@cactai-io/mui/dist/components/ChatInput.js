'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/components/ChatInput.tsx
// Primary natural language input. Silicon Valley quality.
// Multiline, file upload, keyboard shortcuts, character awareness.
// Enter to send, Shift+Enter for newline, Cmd/Ctrl+Enter always sends.
// MUI Doctrine V: input returned to GAS unmodified.
//
// Authority: MUI Architecture v0.2 Section 3, 6
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens.
import { useState, useRef, useCallback, useEffect } from 'react';
import { recordGesture } from '../security/SecurityLayer.js';
const MAX_ROWS = 8;
const LINE_HEIGHT_PX = 22;
const MIN_HEIGHT_PX = 44;
export const ChatInput = ({ theme: t, onSubmit, disabled = false, placeholder = 'Message...', prefillValue, }) => {
    const [value, setValue] = useState(prefillValue ?? '');
    const [files, setFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    // Sync prefill value when it changes (goal revision populates input)
    useEffect(() => {
        if (prefillValue !== undefined) {
            setValue(prefillValue);
            if (textareaRef.current) {
                textareaRef.current.focus();
                autoResize();
            }
        }
    }, [prefillValue]);
    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el)
            return;
        el.style.height = 'auto';
        const maxHeight = LINE_HEIGHT_PX * MAX_ROWS;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    }, []);
    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed && files.length === 0)
            return;
        if (disabled)
            return;
        recordGesture();
        onSubmit(trimmed);
        setValue('');
        setFiles([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = `${MIN_HEIGHT_PX}px`;
        }
    }, [value, files, disabled, onSubmit]);
    const handleKeyDown = useCallback((e) => {
        // Cmd/Ctrl+Enter always sends
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
            return;
        }
        // Enter sends, Shift+Enter inserts newline
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            return;
        }
    }, [handleSubmit]);
    const handleChange = useCallback((e) => {
        setValue(e.target.value);
        autoResize();
    }, [autoResize]);
    const handleFileSelect = useCallback((e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    }, []);
    const removeFile = useCallback((index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);
    const canSend = (value.trim().length > 0 || files.length > 0) && !disabled;
    return (_jsxs("div", { onDragOver: (e) => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), onDrop: handleDrop, style: {
            position: 'relative',
            backgroundColor: t.color.surface,
            borderRadius: t.radii.lg,
            border: `1px solid ${dragOver ? t.color.primary : t.color.border}`,
            transition: t.transitions.fast,
            opacity: disabled ? 0.6 : 1,
        }, children: [files.length > 0 && (_jsx("div", { style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: t.spacing.scale['2'],
                    padding: `${t.spacing.scale['2']} ${t.spacing.scale['3']} 0`,
                }, children: files.map((file, i) => (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: t.spacing.scale['1'],
                        padding: `${t.spacing.scale['1']} ${t.spacing.scale['2']}`,
                        backgroundColor: t.color.background,
                        borderRadius: t.radii.sm,
                        fontSize: t.typography.fontSize.xs,
                        color: t.color.text.secondary,
                        maxWidth: '200px',
                    }, children: [_jsx("span", { style: {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }, children: file.name }), _jsx("button", { onClick: () => removeFile(i), "aria-label": `Remove ${file.name}`, style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: t.color.text.disabled,
                                cursor: 'pointer',
                                fontSize: '14px',
                                flexShrink: 0,
                                padding: 0,
                            }, children: "\u00D7" })] }, i))) })), _jsx("textarea", { ref: textareaRef, value: value, onChange: handleChange, onKeyDown: handleKeyDown, placeholder: placeholder, disabled: disabled, rows: 1, "aria-label": "Message input", style: {
                    width: '100%',
                    minHeight: `${MIN_HEIGHT_PX}px`,
                    maxHeight: `${LINE_HEIGHT_PX * MAX_ROWS}px`,
                    padding: `${t.spacing.scale['3']} ${t.spacing.scale['3']}`,
                    paddingRight: '96px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: t.typography.fontFamily.base,
                    fontSize: t.typography.fontSize.md,
                    lineHeight: `${LINE_HEIGHT_PX}px`,
                    color: t.color.text.primary,
                    overflow: 'auto',
                } }), _jsxs("div", { style: {
                    position: 'absolute',
                    right: t.spacing.scale['2'],
                    bottom: t.spacing.scale['2'],
                    display: 'flex',
                    alignItems: 'center',
                    gap: t.spacing.scale['1'],
                }, children: [_jsx("button", { onClick: () => fileInputRef.current?.click(), "aria-label": "Attach file", disabled: disabled, style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: t.radii.sm,
                            color: t.color.text.disabled,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: t.transitions.fast,
                            padding: 0,
                        }, children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" }) }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, onChange: handleFileSelect, style: { display: 'none' }, tabIndex: -1 }), _jsx("button", { onClick: handleSubmit, disabled: !canSend, "aria-label": "Send message", style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: canSend ? t.color.primary : 'transparent',
                            border: 'none',
                            borderRadius: t.radii.sm,
                            color: canSend ? 'var(--c-surface)' : t.color.text.disabled,
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            transition: t.transitions.fast,
                            padding: 0,
                        }, children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }) })] })] }));
};
//# sourceMappingURL=ChatInput.js.map