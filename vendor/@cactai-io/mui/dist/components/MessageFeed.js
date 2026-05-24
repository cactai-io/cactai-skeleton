import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageBubble } from './MessageBubble.js';
import { StreamingBubble } from './StreamingBubble.js';
export const MessageFeed = ({ messages, streamBuffer, streaming, theme: t, onArtifactAction, }) => {
    return (_jsxs("div", { role: "log", "aria-label": "Conversation", "aria-live": "polite", style: {
            display: 'flex',
            flexDirection: 'column',
            gap: t.spacing.scale['4'],
        }, children: [messages.map((msg, i) => (_jsx(MessageBubble, { message: msg, theme: t, onArtifactAction: onArtifactAction }, msg.request_id ?? i))), streaming && streamBuffer.length > 0 && (_jsx(StreamingBubble, { buffer: streamBuffer, theme: t }))] }));
};
//# sourceMappingURL=MessageFeed.js.map