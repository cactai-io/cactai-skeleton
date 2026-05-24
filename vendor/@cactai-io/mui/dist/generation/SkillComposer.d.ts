import type { ThemeTokens } from '@cactai-io/themes';
import type { SkillDescriptor, SkillInvocationResult } from '../types/mui.types.js';
import { SkillRegistry } from './SkillRegistry.js';
export declare class SkillComposer {
    private registry;
    private theme;
    private ssr;
    constructor(registry: SkillRegistry, theme: ThemeTokens, ssr: boolean);
    compose(descriptor: SkillDescriptor, artifactData: unknown, surfaceConfig?: unknown): SkillInvocationResult;
}
