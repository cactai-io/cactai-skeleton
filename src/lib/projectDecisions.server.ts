// src/lib/projectDecisions.server.ts
// Helpers for reading and writing slots inside project_state.decisions
// JSONB on the developer's own Supabase.
//
// project_state.decisions is the catch-all decision log used by the
// workflow runtime, the Operate UI, and DevShell. Each reserved key has a
// typed reader/writer here so callers don't drift on key names or shapes.
//
// Reserved keys:
//   signup_mode_v1             — sign-up policy for end users (DB DEFAULT)
//   default_tenant_id          — tenant new users join under *_single_workspace modes
//   invitation_email_v1        — invitation email provider config (Operate)
//   capability_config_v2       — Thread 06: tool/skill availability per scope
//   active_personality_id      — Thread 07: selected personality
//   dev_authored_personalities — Thread 07: dev-authored personality records
//   active_workflow_id         — Thread 08: selected workflow
//   byok                       — Thread 08: BYOK toggle + provider keys
//
// Server-only. All callers are Next.js route handlers in src/app/api/ and
// the platform-side DevShell orchestrator (which reads via the service
// Supabase client over the same JSONB shape).

import 'server-only';
import { endpoints } from './endpoints';
import { createServiceSupabaseClient } from './supabase.server';
import type {
  CapabilityConfig,
  CapabilityScopeConfig,
  DevAuthoredPersonalityRecord,
} from '@cactai-io/types';

// Stable storage keys. Each value is a path through the decisions JSONB.
// Centralised here so the route handlers can't drift on key names.
export const DECISION_KEYS = {
  signupMode:               'signup_mode_v1',
  defaultTenantId:          'default_tenant_id',
  invitationEmail:          'invitation_email_v1',
  // v1.3 Phase 3 — developer's app-level reasoning model selection.
  // Read by the platform's OrchestrationEngine at session-open and
  // threaded into session.working_memory.shell_meta.reasoning_model so
  // the engine can skip the Sonnet classifier when the developer has
  // explicitly picked. See gas-engine-reasoning-tool-tier-implementation.md.
  reasoningModel:           'reasoning_model_v1',
  // v1.3 Phase 14 — per-task-type Agent SDK model selections.
  // Maps each of the 11 AgentTaskType slugs to a tier (haiku/sonnet/
  // opus). The orchestrator's launch*Dispatch functions read this at
  // dispatch time and pass it as hooks.modelSelections to the
  // AgentDispatcher. See agent-sdk-model-selection-protocol.md.
  modelSelections:          'model_selections_v1',
  capabilityConfig:         'capability_config_v2',
  activePersonalityId:      'active_personality_id',
  devAuthoredPersonalities: 'dev_authored_personalities',
  activeWorkflowId:         'active_workflow_id',
  byok:                     'byok',
} as const;

// ── Handoff contract — what decisions contains on first DevShell open ───────
//
// The setup wizard (platform-repo apps/api/src/routes/provision.ts +
// customer-bootstrap.ts) intentionally does NOT pre-populate project_state.
// The first writer (Operate's EmailConfigCard, DevShell's orchestrator, or
// the workflow runtime) does the initial INSERT, at which point the JSONB
// column's DEFAULT clause from 0001_initial.sql lands:
//
//   {"signup_mode_v1": "multi_user_single_workspace"}
//
// On the very first DevShell open after provisioning:
//
//   - signup_mode_v1 — GUARANTEED present once any code has touched
//     project_state (DB DEFAULT). DevShell should treat this as always
//     readable; if it's somehow missing, fall back to INITIAL_DECISIONS.
//   - All other reserved keys — ABSENT. Consumers must treat undefined as
//     "developer has not yet made this decision" and surface a prompt or
//     null state, never a hard error.
//
// When adding a new wizard step that pre-populates a decision, add the key
// to DECISION_KEYS, the field to ProjectStateDecisions, and update the
// guarantees in this comment so DevShell knows what's been set already.

export type SignupModeId =
  | 'single_user_shared'
  | 'single_user_isolated'
  | 'multi_user_single_workspace'
  | 'multi_user_multi_workspace';

export interface InvitationEmailDecision {
  provider:        'supabase' | 'resend' | 'none';
  email_from?:     string;
  resend_api_key?: string;
}

/** v1.3 Phase 3 — developer's choice for the GAS engine's REASONING step.
 *  'sonnet' or 'opus'. When null/absent, the engine runs its Sonnet
 *  classifier to pick. Set via the Operate UI's AI Configuration card. */
export type ReasoningModelChoice = 'sonnet' | 'opus';

/** v1.3 Phase 14 — per-task-type Agent SDK model selections. Mirrors
 *  ModelSelections in @cactai-io/core/agent-sdk. Stored as the decision
 *  payload at project_state.decisions.model_selections_v1; the
 *  orchestrator reads at dispatch time. */
export interface ModelSelectionsDecision {
  file_reading:                 'haiku' | 'sonnet' | 'opus';
  discrete_file_change:         'haiku' | 'sonnet' | 'opus';
  component_page_generation:    'haiku' | 'sonnet' | 'opus';
  api_route_handler_generation: 'haiku' | 'sonnet' | 'opus';
  database_schema:              'haiku' | 'sonnet' | 'opus';
  tool_skill_authoring:         'haiku' | 'sonnet' | 'opus';
  ui_design_styling:            'haiku' | 'sonnet' | 'opus';
  code_review:                  'haiku' | 'sonnet' | 'opus';
  refactoring:                  'haiku' | 'sonnet' | 'opus';
  legal_content_generation:     'haiku' | 'sonnet' | 'opus';
  complex_multi_file_feature:   'haiku' | 'sonnet' | 'opus';
}

export interface ProjectStateDecisions {
  // Guaranteed present on first DevShell open (DB DEFAULT).
  signup_mode_v1?:             SignupModeId;

  // Populated post-provision by Operate, DevShell, or the workflow runtime.
  // Absent on first DevShell open; consumers must tolerate undefined.
  default_tenant_id?:          string;
  invitation_email_v1?:        InvitationEmailDecision;
  reasoning_model_v1?:         ReasoningModelChoice;
  model_selections_v1?:        ModelSelectionsDecision;
  capability_config_v2?:       CapabilityConfig;
  active_personality_id?:      string;
  dev_authored_personalities?: Record<string, DevAuthoredPersonalityRecord>;
  active_workflow_id?:         string;
  byok?:                       BYOKBlob;
}

// Fallback shape mirroring the project_state.decisions DEFAULT in
// 0001_initial.sql. Code that reads decisions before the project_state
// row exists (rare; the row is created by the first writer) can use this
// as the baseline.
export const INITIAL_DECISIONS: ProjectStateDecisions = {
  signup_mode_v1: 'multi_user_single_workspace',
} as const;

const EMPTY_SCOPE: CapabilityScopeConfig = {
  enabled:              {},
  defaults_by_category: {},
};
export const EMPTY_CAPABILITY_CONFIG: CapabilityConfig = {
  appshell: { ...EMPTY_SCOPE, enabled: {}, defaults_by_category: {} },
  devshell: { ...EMPTY_SCOPE, enabled: {}, defaults_by_category: {} },
};

// Internal: load the decisions JSONB. Returns an empty object when no
// project_state row exists yet (a freshly provisioned project hits this
// before the workflow has written anything).
async function loadDecisions(): Promise<Record<string, unknown>> {
  const supabase  = createServiceSupabaseClient();
  const projectId = endpoints.projectId;
  const { data, error } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(`project_state load failed: ${error.message}`);
  return (data?.decisions ?? {}) as Record<string, unknown>;
}

// Typed loader for the full decisions blob. Use this from DevShell or any
// consumer that needs the structured shape; per-key helpers below still
// work for narrow reads/writes. Returns INITIAL_DECISIONS shape merged
// with whatever's persisted — guarantees signup_mode_v1 is always set
// (DB DEFAULT applies when the row is created by any writer).
export async function loadProjectStateDecisions(): Promise<ProjectStateDecisions> {
  const raw = await loadDecisions();
  return { ...INITIAL_DECISIONS, ...(raw as ProjectStateDecisions) };
}

// Internal: persist a partial update to decisions. Read-modify-write —
// concurrent writers will collide, but the settings UI is single-actor
// so this is acceptable. (Future: switch to a JSONB-merge SQL function
// if multi-actor edits become common.)
async function patchDecisions(patch: Record<string, unknown>): Promise<void> {
  const supabase  = createServiceSupabaseClient();
  const projectId = endpoints.projectId;
  const existing  = await loadDecisions();
  const merged    = { ...existing, ...patch };
  const { error } = await supabase
    .from('project_state')
    .update({ decisions: merged })
    .eq('project_id', projectId);
  if (error) throw new Error(`project_state update failed: ${error.message}`);
}

// ── v1.4 App Config ADD tabs (Sharing / Collaboration / AI Actions / Custom) ─
// Stored as decisions.* keys (no migration). Tab visibility derives from the
// build manifest's pruning flags so disabled-capability tabs stay hidden.
export interface AppConfigExtras {
  sharing:       unknown;
  collaboration: unknown;
  ai_actions:    unknown[];
  custom_tabs:   unknown[];
  visibility:    { ai: boolean; paid: boolean; sharing: boolean; collaboration: boolean };
}

const APP_CONFIG_KEYS = new Set(['sharing_v1', 'collaboration_v1', 'ai_actions_v1', 'custom_tabs_v1']);

export async function loadAppConfigExtras(): Promise<AppConfigExtras> {
  const supabase  = createServiceSupabaseClient();
  const projectId = endpoints.projectId;
  const { data, error } = await supabase
    .from('project_state')
    .select('decisions, build_manifest')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(`project_state load failed: ${error.message}`);
  const d = (data?.decisions ?? {}) as Record<string, unknown>;
  const m = (data?.build_manifest ?? {}) as { pruning?: Record<string, { value?: unknown }> };
  const p = m.pruning ?? {};
  const cost = p.cost?.value;
  return {
    sharing:       d['sharing_v1'] ?? null,
    collaboration: d['collaboration_v1'] ?? null,
    ai_actions:    Array.isArray(d['ai_actions_v1'])  ? d['ai_actions_v1']  as unknown[] : [],
    custom_tabs:   Array.isArray(d['custom_tabs_v1']) ? d['custom_tabs_v1'] as unknown[] : [],
    visibility: {
      ai:            p.ai_integration?.value != null && p.ai_integration?.value !== 'none',
      paid:          Array.isArray(cost) && (cost as unknown[]).includes('paid'),
      sharing:       p.sharing?.value === true,
      collaboration: p.collaboration?.value === 'collab',
    },
  };
}

export async function saveAppConfigExtra(key: string, value: unknown): Promise<void> {
  if (!APP_CONFIG_KEYS.has(key)) throw new Error(`unknown app-config key: ${key}`);
  await patchDecisions({ [key]: value });
}

// ── Capability config (Thread 06) ───────────────────────────────────────────

export async function loadCapabilityConfig(): Promise<CapabilityConfig> {
  const d   = await loadDecisions();
  const raw = d[DECISION_KEYS.capabilityConfig];
  if (!raw || typeof raw !== 'object') return EMPTY_CAPABILITY_CONFIG;
  const cc  = raw as Partial<CapabilityConfig>;
  return {
    appshell: cc.appshell ?? { enabled: {}, defaults_by_category: {} },
    devshell: cc.devshell ?? { enabled: {}, defaults_by_category: {} },
  };
}

export async function saveCapabilityConfig(cfg: CapabilityConfig): Promise<void> {
  await patchDecisions({ [DECISION_KEYS.capabilityConfig]: cfg });
}

// ── Active personality (Thread 07) ──────────────────────────────────────────

export async function loadActivePersonalityId(): Promise<string | null> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.activePersonalityId];
  return typeof v === 'string' ? v : null;
}

export async function saveActivePersonalityId(id: string): Promise<void> {
  await patchDecisions({ [DECISION_KEYS.activePersonalityId]: id });
}

export async function loadDevAuthoredPersonalities(): Promise<Record<string, DevAuthoredPersonalityRecord>> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.devAuthoredPersonalities];
  if (!v || typeof v !== 'object') return {};
  return v as Record<string, DevAuthoredPersonalityRecord>;
}

export async function saveDevAuthoredPersonality(rec: DevAuthoredPersonalityRecord): Promise<void> {
  const existing = await loadDevAuthoredPersonalities();
  const merged   = { ...existing, [rec.id]: rec };
  await patchDecisions({ [DECISION_KEYS.devAuthoredPersonalities]: merged });
}

// ── Active workflow (Thread 08) ─────────────────────────────────────────────

export async function loadActiveWorkflowId(): Promise<string | null> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.activeWorkflowId];
  return typeof v === 'string' ? v : null;
}

export async function saveActiveWorkflowId(id: string): Promise<void> {
  await patchDecisions({ [DECISION_KEYS.activeWorkflowId]: id });
}

// ── Reasoning model (v1.3 Phase 3) ──────────────────────────────────────────

export async function loadReasoningModel(): Promise<ReasoningModelChoice | null> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.reasoningModel];
  return v === 'sonnet' || v === 'opus' ? v : null;
}

export async function saveReasoningModel(choice: ReasoningModelChoice | null): Promise<void> {
  // Saving null clears the developer's manual pick — the engine falls
  // back to the Sonnet classifier on subsequent sessions. We patch with
  // the value (or explicit null sentinel) and let the route layer decide
  // how to surface "no manual setting" semantics to the developer.
  await patchDecisions({ [DECISION_KEYS.reasoningModel]: choice });
}

// ── Per-task-type model selections (Phase 14) ───────────────────────────

export async function loadModelSelections(): Promise<ModelSelectionsDecision | null> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.modelSelections];
  if (!v || typeof v !== 'object') return null;
  // Defensive: a stale shape could miss task types added later. The
  // orchestrator's hooks.modelSelections passes the partial result; the
  // dispatcher falls back to DEFAULT_MODEL_SELECTIONS for missing keys.
  return v as ModelSelectionsDecision;
}

export async function saveModelSelections(selections: ModelSelectionsDecision): Promise<void> {
  await patchDecisions({ [DECISION_KEYS.modelSelections]: selections });
}

// ── BYOK toggle (Thread 08) ─────────────────────────────────────────────────
//
// 2026-05-29 — `encrypted` is now a real v2 envelope, not a plaintext
// placeholder. See secrets.server.ts for the envelope format. Both the
// platform (writes during provision via setCustomerByokKey on the platform
// side) and the skeleton (writes via /api/settings/byok) MUST encrypt
// before storing; both decrypt on read with the shared SECRETS_ENCRYPTION_KEY.

import { encryptSecret, decryptSecret, isEncrypted } from './secrets.server';

export interface BYOKBlob {
  enabled:   boolean;
  /** value: v2 envelope (encryptSecret output). Never plaintext. */
  providers: Record<string, { encrypted: string; updated_at: string }>;
}

/** Load the BYOK blob WITHOUT decrypting — callers that just need
 *  presence + masked-display use this. The masked display uses the
 *  last 4 chars of the envelope ciphertext, which is fine for "do we
 *  have a key for this provider" UI; not the actual key tail. */
export async function loadBYOK(): Promise<BYOKBlob> {
  const d = await loadDecisions();
  const v = d[DECISION_KEYS.byok];
  if (!v || typeof v !== 'object') return { enabled: false, providers: {} };
  const blob = v as Partial<BYOKBlob>;
  return {
    enabled:   blob.enabled ?? false,
    providers: blob.providers ?? {},
  };
}

/** Resolve a single provider's plaintext key for use at runtime (turn
 *  execution, etc.). Returns null when the provider isn't configured.
 *  Throws on a malformed / unreadable envelope so callers don't
 *  silently fall through to a wrong-provider path. */
export async function getBYOKPlaintext(providerId: string): Promise<string | null> {
  const blob = await loadBYOK();
  const rec  = blob.providers[providerId];
  if (!rec || !rec.encrypted) return null;
  if (!isEncrypted(rec.encrypted)) {
    // Backward-compat: any value written before the encryption upgrade
    // (pre-2026-05-29) was stored as plaintext. Treat as plaintext but
    // log a warning so we know it should be re-saved to upgrade format.
    console.warn(`[byok] provider=${providerId} stored unencrypted; please re-save to upgrade format`);
    return rec.encrypted;
  }
  return await decryptSecret(rec.encrypted);
}

/** Write a single provider's key. Always encrypts before storing — the
 *  caller passes plaintext, never an envelope. */
export async function setBYOKKey(providerId: string, plaintextKey: string): Promise<void> {
  const envelope = await encryptSecret(plaintextKey);
  const blob = await loadBYOK();
  blob.providers[providerId] = { encrypted: envelope, updated_at: new Date().toISOString() };
  await saveBYOK(blob);
}

/** Persist the full blob. Callers should normally use setBYOKKey for
 *  per-provider writes; saveBYOK is exposed for the toggle path
 *  (enabled: true/false) and bulk replacement. */
export async function saveBYOK(blob: BYOKBlob): Promise<void> {
  await patchDecisions({ [DECISION_KEYS.byok]: blob });
}

// Cheap last-4-only masking on the ENVELOPE for the display UI.
// Different from the actual key tail (which would require decryption);
// this is just "is something there" affordance for the settings page.
export function maskBYOKValue(envelope: string): string {
  if (!envelope) return '';
  const tail = envelope.slice(-4);
  return `••••${tail}`;
}
