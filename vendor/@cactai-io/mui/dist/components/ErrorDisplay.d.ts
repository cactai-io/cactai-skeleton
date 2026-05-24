import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { GASErrorType } from '@cactai-io/types';
interface ErrorDisplayProps {
    error: GASErrorType;
    theme: ThemeTokens;
    onRetry: () => void;
    onDismiss: () => void;
}
export declare const ErrorDisplay: React.FC<ErrorDisplayProps>;
export {};
