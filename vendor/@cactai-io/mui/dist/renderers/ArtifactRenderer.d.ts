import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { ArtifactObject } from '@cactai-io/types';
import type { SkillInvocationResult } from '../types/mui.types.js';
interface ArtifactRendererProps {
    artifact: ArtifactObject;
    theme: ThemeTokens;
    skillResult?: SkillInvocationResult;
    onArtifactAction: (id: string, action: string) => void;
}
export declare const ArtifactRenderer: React.FC<ArtifactRendererProps>;
export {};
