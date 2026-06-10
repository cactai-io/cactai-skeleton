'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/components/DevChatPanel.tsx
// Developer chat panel — left column of the DevShell.
//
// Design: document-style conversation. No chat bubbles.
// Agent responses: full-width flowing text, gradient author label.
// User messages: left accent-line, slightly dimmed body.
// Character animation in header maps to current agent state.
//
// File attachment: code files only, max 100KB each, max 5 per turn.
// Binary/image files rejected with a GitHub redirect explanation.
// Classification chip shown on agent messages when turn was flagged as
// tangent_capture or plan_goal (backlog candidate).
//
// View context: the panel knows which view is active and prefixes the
// placeholder text accordingly so the developer knows chat is context-aware.
import { useState, useRef, useCallback, useEffect, } from 'react';
import { CharacterRenderer, morphToMood } from '../characters/CharacterRenderer.js';
// Allowed code file extensions
const ALLOWED_EXTENSIONS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    'json', 'yaml', 'yml', 'toml',
    'css', 'scss', 'sass',
    'html', 'htm', 'svg',
    'md', 'mdx', 'txt',
    'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cpp', 'h',
    'sh', 'bash', 'zsh', 'fish',
    'sql', 'prisma', 'graphql',
    'env', 'env.example',
]);
// Image extensions get their own pipeline: read as base64 data URL,
// preview as a thumbnail in the attached-files row. The agent receives
// the filename as a content marker (proper multimodal — passing the
// image bytes through to the LLM — still requires platform-side wiring
// of structured content in inputRouter + turn handler).
const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
]);
const BINARY_EXTENSIONS = new Set([
    'ico', 'tiff',
    'mp4', 'mov', 'avi', 'webm',
    'mp3', 'wav', 'ogg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dmg', 'pkg', 'deb',
    'woff', 'woff2', 'ttf', 'eot',
]);
const MAX_FILE_SIZE = 100 * 1024; // 100KB for text/code files
const MAX_IMAGE_FILE_SIZE = 4 * 1024 * 1024; // 4MB for images
const MAX_FILES_PER_TURN = 5;
function getExtension(filename) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}
const VIEW_PLACEHOLDERS = {
    build: 'Describe what to build or change…',
    plan: 'Add a goal, plan a sprint, or take notes…',
    test_drive: 'Ask about this view or describe a change from the selected lens…',
    history: 'Ask about a past decision…',
};
const AGENT_STATE_LABELS = {
    idle: 'idle',
    thinking: 'thinking',
    executing: 'executing',
    awaiting_input: 'waiting',
    delivering: 'responding',
    complete: 'idle',
    error: 'error',
    unhandled_artifact: 'idle',
};
const CLASSIFICATION_LABELS = {
    tangent_capture: '↗ saved to plan',
    plan_goal: '↗ added to backlog',
};
export function DevChatPanel({ shell, messages, agentState, character, agentDisplayName, activeView, onCollapse, inspectorLabel, onClearInspector, streamingContent, chatError, disabled = false, className = '', style, }) {
    const [input, setInput] = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [attachError, setAttachError] = useState(null);
    const [sending, setSending] = useState(false);
    // Optimistic user messages — the MUIShell store only tracks AGENT responses,
    // so the user's own message would never render. We append it locally on send
    // and merge it into the thread by timestamp.
    const [sentMessages, setSentMessages] = useState([]);
    const textareaRef = useRef(null);
    const bodyRef = useRef(null);
    const fileInputRef = useRef(null);
    // Auto-scroll to bottom on new messages
    useEffect(() => {
        const el = bodyRef.current;
        if (el)
            el.scrollTop = el.scrollHeight;
    }, [messages, streamingContent]);
    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta)
            return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
    }, [input]);
    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || sending || disabled)
            return;
        // Build content — append text file contents as code blocks; images
        // get a filename marker (the agent sees the marker and can ask the
        // user about it, even though the bytes don't yet travel through the
        // single-string content path the platform turn handler accepts).
        let content = trimmed;
        for (const f of attachedFiles) {
            if (f.kind === 'image') {
                content += `\n\n[Attached image: ${f.name}]`;
                continue;
            }
            const ext = getExtension(f.name);
            content += `

\`\`\`${ext}
// ${f.name}
${f.content}
\`\`\``;
        }
        // Echo the user's message into the thread immediately (the store won't).
        setSentMessages(prev => [...prev, {
                id: `user-${Date.now()}`,
                role: 'user',
                content,
                timestamp: new Date().toISOString(),
            }]);
        setSending(true);
        setInput('');
        setAttachedFiles([]);
        setAttachError(null);
        try {
            await shell.submitInput(content);
        }
        finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    }, [input, attachedFiles, sending, disabled, shell]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);
    const handleFileSelect = useCallback(async (e) => {
        setAttachError(null);
        const files = Array.from(e.target.files ?? []);
        if (!files.length)
            return;
        const remaining = MAX_FILES_PER_TURN - attachedFiles.length;
        if (remaining <= 0) {
            setAttachError(`Maximum ${MAX_FILES_PER_TURN} files per message.`);
            return;
        }
        const toProcess = files.slice(0, remaining);
        const newAttached = [];
        const errors = [];
        for (const file of toProcess) {
            const ext = getExtension(file.name);
            if (IMAGE_EXTENSIONS.has(ext)) {
                if (file.size > MAX_IMAGE_FILE_SIZE) {
                    errors.push(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — max image size is 4MB.`);
                    continue;
                }
                try {
                    const content = await readFileAsDataURL(file);
                    newAttached.push({ name: file.name, content, size: file.size, kind: 'image' });
                }
                catch {
                    errors.push(`${file.name}: could not read image.`);
                }
                continue;
            }
            if (BINARY_EXTENSIONS.has(ext)) {
                errors.push(`${file.name} is a binary file. Upload it directly to GitHub, then paste the path here.`);
                continue;
            }
            if (!ALLOWED_EXTENSIONS.has(ext) && ext !== '') {
                errors.push(`${file.name}: unrecognized file type. Only code files and images are supported.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} is ${(file.size / 1024).toFixed(0)}KB — max is 100KB.`);
                continue;
            }
            try {
                const content = await readFileAsText(file);
                newAttached.push({ name: file.name, content, size: file.size, kind: 'text' });
            }
            catch {
                errors.push(`${file.name}: could not read file.`);
            }
        }
        if (errors.length)
            setAttachError(errors[0] ?? null);
        if (newAttached.length)
            setAttachedFiles(prev => [...prev, ...newAttached]);
        // Reset file input so same file can be re-attached after removal
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    }, [attachedFiles]);
    const removeAttachment = useCallback((name) => {
        setAttachedFiles(prev => prev.filter(f => f.name !== name));
    }, []);
    const mood = morphToMood(agentState);
    const stateLabel = AGENT_STATE_LABELS[agentState] ?? 'idle';
    const placeholder = VIEW_PLACEHOLDERS[activeView];
    const canSend = input.trim().length > 0 && !sending && !disabled;
    return (_jsxs("div", { className: `ds-chat ${className}`, style: style, "data-view": activeView, children: [_jsxs("div", { className: "ds-chat-header", children: [_jsx("div", { className: "ds-char-wrap", children: character ? (_jsx(CharacterRenderer, { character: character, mood: mood, size: 51 })) : (_jsx("span", { className: "ds-char-fallback", style: { width: 8, height: 8 } })) }), _jsxs("div", { className: "ds-agent-label", children: [_jsx("span", { className: "ds-agent-name", children: agentDisplayName }), _jsx("span", { className: "ds-agent-state-text", children: stateLabel })] }), _jsx("button", { className: "ds-chat-collapse", onClick: onCollapse, title: "Collapse chat", "aria-label": "Collapse chat panel", children: "\u2039" })] }), inspectorLabel && (_jsxs("div", { className: "ds-inspector-banner", children: [_jsx("span", { className: "ds-inspector-banner-dot" }), _jsx("span", { className: "ds-inspector-banner-label ds-mono", children: inspectorLabel }), _jsx("button", { className: "ds-inspector-banner-clear", onClick: onClearInspector, "aria-label": "Clear selection", children: "\u2715" })] })), _jsxs("div", { className: "ds-chat-body", ref: bodyRef, role: "log", "aria-live": "polite", children: [[...messages, ...sentMessages]
                        .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
                        .map(msg => (_jsxs("div", { className: `ds-msg ${msg.role === 'agent' ? 'ds-msg-agent' : 'ds-msg-user'}`, children: [_jsx("div", { className: "ds-msg-author", children: msg.role === 'agent' ? agentDisplayName : 'You' }), _jsx("div", { className: "ds-msg-body", children: msg.content }), msg.classification && CLASSIFICATION_LABELS[msg.classification] && (_jsx("div", { className: `ds-msg-chip ds-chip-backlog`, children: CLASSIFICATION_LABELS[msg.classification] }))] }, msg.id))), streamingContent && (_jsxs("div", { className: "ds-msg ds-msg-agent ds-streaming-bubble", children: [_jsx("div", { className: "ds-msg-author", children: agentDisplayName }), _jsx("div", { className: "ds-msg-body", children: _jsx(StreamingText, { content: streamingContent }) })] })), (agentState === 'thinking' || agentState === 'executing') && !streamingContent && (_jsxs("div", { className: "ds-msg ds-msg-agent", children: [_jsx("div", { className: "ds-msg-author", children: agentDisplayName }), _jsx("div", { className: "ds-msg-body ds-text-3", children: _jsx(ThinkingDots, {}) })] })), chatError && (_jsxs("div", { className: "ds-msg ds-msg-agent", children: [_jsx("div", { className: "ds-msg-author", style: { color: 'var(--c-warning, #FFB44D)' }, children: "\u26A0 Couldn\u2019t complete that" }), _jsx("div", { className: "ds-msg-body", style: { color: 'var(--ds-text-2)' }, children: chatError })] }))] }), attachedFiles.length > 0 && (_jsx("div", { className: "ds-attach-list", children: attachedFiles.map(f => (_jsxs("div", { className: "ds-attach-pill", children: [f.kind === 'image' && (_jsx("img", { src: f.content, alt: f.name, style: { width: 24, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 } })), _jsx("span", { className: "ds-mono", children: f.name }), _jsx("span", { style: { color: 'var(--ds-text-3)', fontSize: 10 }, children: f.size > 1024 * 1024
                                ? `${(f.size / 1024 / 1024).toFixed(1)}MB`
                                : `${(f.size / 1024).toFixed(0)}KB` }), _jsx("button", { className: "ds-attach-remove", onClick: () => removeAttachment(f.name), "aria-label": `Remove ${f.name}`, children: "\u2715" })] }, f.name))) })), attachError && (_jsx("div", { style: {
                    padding: '6px 14px',
                    fontSize: 11,
                    color: 'var(--ds-orange)',
                    borderTop: '1px solid var(--ds-border-soft)',
                }, children: attachError })), _jsx("div", { className: "ds-chat-input-area", children: _jsxs("div", { className: "ds-chat-input-shell", children: [_jsx("textarea", { ref: textareaRef, className: "ds-chat-textarea", placeholder: placeholder, value: input, onChange: e => setInput(e.target.value), onKeyDown: handleKeyDown, disabled: disabled || sending, rows: 1, "aria-label": "Chat input" }), _jsxs("div", { className: "ds-chat-input-actions", children: [_jsx("button", { className: "ds-attach-btn", onClick: () => fileInputRef.current?.click(), disabled: attachedFiles.length >= MAX_FILES_PER_TURN || disabled, title: "Attach code (max 100KB) or image (max 4MB) \u2014 max 5 per message", "aria-label": "Attach file", children: "+" }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, style: { display: 'none' }, onChange: handleFileSelect, accept: [
                                        ...Array.from(ALLOWED_EXTENSIONS).map(e => `.${e}`),
                                        ...Array.from(IMAGE_EXTENSIONS).map(e => `.${e}`),
                                        'image/*',
                                    ].join(',') }), _jsxs("div", { className: "ds-input-meta", children: [_jsx("span", { className: "ds-input-hint", children: "\u23CE send" }), _jsx("button", { className: "ds-send-btn", onClick: handleSend, disabled: !canSend, "aria-label": "Send message", children: "\u2191" })] })] })] }) })] }));
}
function ThinkingDots() {
    return (_jsx("span", { style: { display: 'inline-flex', gap: 3, alignItems: 'center', paddingTop: 2 }, children: [0, 1, 2].map(i => (_jsx("span", { style: {
                width: 5, height: 5,
                borderRadius: '50%',
                background: 'var(--ds-text-3)',
                animation: `ds-char-fallback-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            } }, i))) }));
}
// Splits live streaming content into a static head and a trailing tail that
// wears the brand-gradient sweep. The visual reads as the agent "thinking
// through" the most recent ~80 characters — those characters carry the
// brand gradient with a slow background-position cycle, while everything
// upstream of them has already settled into the standard body text color.
//
// Why a split: applying the gradient to the entire bubble would make every
// streamed character look "in flight" for the whole turn, which gets noisy.
// Confining the gradient to the tail keeps the motion localised to the
// actually-arriving content. When the turn completes, the streaming bubble
// unmounts and is replaced by a MessageBubble with no gradient — final
// state is always plain text.
//
// Tail length: 80 characters is roughly a sentence and a half at the chat
// font size. Short enough to not dominate; long enough that the gradient
// has somewhere to live. If the total streamed content is shorter than
// the tail length, the entire bubble is the tail.
const STREAMING_TAIL_LEN = 80;
function StreamingText({ content }) {
    if (content.length <= STREAMING_TAIL_LEN) {
        return _jsx("span", { className: "ds-streaming-tail", children: content });
    }
    const cut = content.length - STREAMING_TAIL_LEN;
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: "ds-streaming-head", children: content.slice(0, cut) }), _jsx("span", { className: "ds-streaming-tail", children: content.slice(cut) })] }));
}
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
    });
}
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(file);
    });
}
//# sourceMappingURL=DevChatPanel.js.map