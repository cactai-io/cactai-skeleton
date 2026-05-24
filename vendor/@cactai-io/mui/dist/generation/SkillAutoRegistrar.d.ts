import type { GenerationResult, RenderingComplexity } from '@cactai-io/types';
import { SkillRegistry } from './SkillRegistry.js';
export declare class SkillAutoRegistrar {
    private registry;
    constructor(registry: SkillRegistry);
    register(result: GenerationResult, context: {
        platform: string;
        ssr: boolean;
        artifactType: string;
        complexity: RenderingComplexity;
    }): void;
}
