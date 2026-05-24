import type { SkillDescriptor, AutoRegisteredSkill, SkillsManifest } from '../types/mui.types.js';
import type { UISkill } from '@cactai-io/types';
export declare class SkillRegistry {
    private library;
    private platform;
    constructor(platform: string);
    /** Resolve the stored module reference for a skill, if any. */
    getModule(skill: UISkill): unknown | undefined;
    getAll(): SkillDescriptor[];
    findActive(artifactType: string, platform?: string): SkillDescriptor | null;
    findAll(artifactType: string, platform?: string): SkillDescriptor[];
    activate(skillId: string): void;
    deactivate(skillId: string): void;
    register(skill: AutoRegisteredSkill): void;
    registerDeveloperWritten(opts: {
        skill_id: string;
        name: string;
        platform: string;
        artifact_types: string[];
        code: string;
        component?: unknown;
    }): void;
    loadPackage(manifest: SkillsManifest): void;
    loadFromRegistry(registry: Record<string, unknown>): void;
    getSkill(skillId: string): UISkill | undefined;
    registerMarketplaceSkill(opts: {
        item_id: string;
        semver: string;
        bundle_sha256: string;
        artifact_types: string[];
        platform: string;
        component: unknown;
        name?: string;
        skill_id?: string;
    }): void;
    clearGenerated(): void;
    private toDescriptor;
    private getArtifactTypes;
}
