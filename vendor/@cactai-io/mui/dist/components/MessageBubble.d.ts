import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { OutputResponse } from '@cactai-io/types';
interface MessageBubbleProps {
    message: OutputResponse;
    theme: ThemeTokens;
    onArtifactAction: (id: string, action: string) => void;
}
export declare const MessageBubble: React.FC<MessageBubbleProps>;
export {};
