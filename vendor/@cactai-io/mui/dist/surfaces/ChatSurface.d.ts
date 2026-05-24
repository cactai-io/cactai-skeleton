import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { MUIStore as MUIStoreShape } from '@cactai-io/types';
interface ChatSurfaceProps {
    store: MUIStoreShape;
    theme: ThemeTokens;
    onSubmit: (content: string) => void;
    onRetry: () => void;
    onDismiss: () => void;
    onStop: () => void;
    onRegenerate: () => void;
    onArtifactAction: (id: string, action: string) => void;
    onSuggestedResponse: (content: string) => void;
    suggestedResponses?: string[];
}
export declare const ChatSurface: React.FC<ChatSurfaceProps>;
export {};
