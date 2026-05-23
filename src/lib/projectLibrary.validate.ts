// src/lib/projectLibrary.validate.ts
// Validators moved to @cactai-io/types so the platform's chat-side "Load tool
// from <paste>" flow shares the same gate as this skeleton's startup loader.
// This file is a re-export shim for the existing skeleton imports.

export {
  validateToolDefinition,
  validateSkillFrontmatter,
  validateWorkflowDefinition,
  looksLikeToolDefinition,
  validateToolSource,
  toolFilenameFor,
  validateSkillSource,
  parseSkillMd,
  skillFolderFor,
} from '@cactai-io/types';
export type {
  ValidationResult,
  ParsedSkillFrontmatter,
  SourceValidationResult,
  SkillSourceValidationResult,
} from '@cactai-io/types';
