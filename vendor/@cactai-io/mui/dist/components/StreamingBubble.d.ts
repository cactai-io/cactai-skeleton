import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { SSETextDelta } from '@cactai-io/types';
interface StreamingBubbleProps {
    buffer: SSETextDelta[];
    theme: ThemeTokens;
}
export declare const StreamingBubble: React.FC<StreamingBubbleProps>;
export {};
