import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
interface ChatInputProps {
    theme: ThemeTokens;
    onSubmit: (content: string) => void;
    disabled?: boolean;
    placeholder?: string;
    prefillValue?: string;
}
export declare const ChatInput: React.FC<ChatInputProps>;
export {};
