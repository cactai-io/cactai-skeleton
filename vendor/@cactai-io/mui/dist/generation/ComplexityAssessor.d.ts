import type { ComplexityAssessment, HandoffSignal } from '@cactai-io/types';
export declare class ComplexityAssessor {
    assess(surfaceType: string, surfaceConfig: unknown, signal?: HandoffSignal): ComplexityAssessment;
}
