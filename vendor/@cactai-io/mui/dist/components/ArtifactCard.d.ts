import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
interface ArtifactCardProps {
    artifact: {
        id: string;
        type?: string;
        [key: string]: unknown;
    };
    theme: ThemeTokens;
    onArtifactAction: (id: string, action: string) => void;
    renderedComponent?: React.ReactNode;
    generatedCode?: string;
}
export declare const ArtifactCard: React.FC<ArtifactCardProps>;
export {};
