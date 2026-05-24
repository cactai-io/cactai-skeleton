import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { GASErrorType } from '@cactai-io/types';
interface ErrorRendererProps {
    error: GASErrorType;
    theme: ThemeTokens;
    onRetry: () => void;
    onDismiss: () => void;
}
export declare const ErrorRenderer: React.FC<ErrorRendererProps>;
export {};
