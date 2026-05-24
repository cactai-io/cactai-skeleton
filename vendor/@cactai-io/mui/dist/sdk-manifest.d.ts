export interface SkillExtensionPoint {
    type: 'skill';
    location: string;
    file_pattern: string;
    descriptor_shape: Record<string, unknown>;
    registration: string;
    example: string;
}
export interface ToolExtensionPoint {
    type: 'tool';
    location: string;
    file_pattern: string;
    registration: string;
}
export interface PersonalityExtensionPoint {
    type: 'personality';
    location: string;
    file_pattern: string;
    shape: string;
}
export interface ThemeExtensionPoint {
    type: 'theme';
    location: string;
    file_pattern: string;
    tokens: string[];
}
export interface WorkflowExtensionPoint {
    type: 'workflow';
    location: string;
    description: string;
}
export type ExtensionPoint = SkillExtensionPoint | ToolExtensionPoint | PersonalityExtensionPoint | ThemeExtensionPoint | WorkflowExtensionPoint;
export interface SDKManifest {
    version: string;
    sdk_package: string;
    extension_points: ExtensionPoint[];
    built_in_skills: string[];
    built_in_tools: string[];
    built_in_personalities: string[];
    workflow_steps: string[];
    role_hierarchy: string[];
}
export declare const SDK_MANIFEST: SDKManifest;
export declare function getManifestJSON(): string;
