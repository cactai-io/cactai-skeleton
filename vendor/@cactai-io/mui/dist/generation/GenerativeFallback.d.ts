import type { ThemeTokens } from '@cactai-io/themes';
import type { ComplexityAssessment, GenerationResult, GenerationBounds } from '@cactai-io/types';
export declare class GenerativeFallback {
    private platform;
    private theme;
    private bounds;
    private apiBaseUrl;
    private apiKey;
    private endUserId?;
    constructor(platform: string, theme: ThemeTokens, bounds: GenerationBounds, apiBaseUrl: string, apiKey: string, endUserId?: string);
    generate(_assessment: ComplexityAssessment, artifactData: unknown, surfaceConfig?: unknown, artifactType?: string): Promise<GenerationResult>;
    private emptyResult;
    private inferSurfaceType;
}
