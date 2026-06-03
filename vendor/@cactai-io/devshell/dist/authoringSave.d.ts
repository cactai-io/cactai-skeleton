import type { AuthoringType } from '@cactai-io/mui';
export interface ComposedArtifact {
    files: Array<{
        path: string;
        content: string;
    }>;
    message: string;
    id: string;
}
/** Returns the file(s) to write for a project-library artifact type, or null
 *  for types that don't live in project-library (personality). */
export declare function composeArtifactFiles(type: AuthoringType, values: Record<string, string>): ComposedArtifact | null;
//# sourceMappingURL=authoringSave.d.ts.map