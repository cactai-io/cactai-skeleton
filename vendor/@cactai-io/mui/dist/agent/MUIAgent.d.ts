import type { RenderContext, RenderDecision } from '../types/mui.types.js';
export declare class MUIAgent {
    decide(context: RenderContext): RenderDecision;
    private findBestMatch;
    private assessComplexity;
}
