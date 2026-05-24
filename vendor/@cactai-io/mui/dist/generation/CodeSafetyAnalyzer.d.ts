export interface AnalysisResult {
    ok: boolean;
    reasons: string[];
}
/**
 * Scan generated source for forbidden patterns. Returns ok: false with one or
 * more reasons if any rule fires, ok: true otherwise.
 *
 * Notes on the design:
 * - This is a regex pass, not an AST pass. A determined attacker can hide
 *   eval behind string concatenation that defeats regex (e.g. `(0,e[v]+'al')(...)`).
 *   The iframe + CSP at the consumer side is the actual security boundary;
 *   this pass is the cheap pre-filter.
 * - We do not gate on import lists here — a stricter import allowlist belongs
 *   in the bundler/runtime, not in a pre-render check.
 */
export declare function analyzeGeneratedCode(code: string): AnalysisResult;
