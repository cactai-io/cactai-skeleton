import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { OutputResponse, SSETextDelta } from '@cactai-io/types';
interface MessageFeedProps {
    messages: OutputResponse[];
    streamBuffer: SSETextDelta[];
    streaming: boolean;
    theme: ThemeTokens;
    onArtifactAction: (id: string, action: string) => void;
}
export declare const MessageFeed: React.FC<MessageFeedProps>;
export {};
