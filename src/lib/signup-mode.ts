// src/lib/signup-mode.ts
// The four signup modes that determine how new sign-ups are handled. A
// single mode replaces the v1.2.3 pair (signup_policy + signup_default_role).
// Each mode dictates a deterministic role assignment and tenant scoping, so
// there's no separate role field to pick — and no way to combine open signup
// with super_admin assignment (the v1.2.3 footgun).
//
// Decision matrix:
//   single_user_shared          – Everyone signs up freely. One shared tenant
//                                 (the default tenant created at provision).
//                                 Every signup gets role='user' on it. Used
//                                 for community/social apps where users see
//                                 each other's content.
//   single_user_isolated        – Everyone signs up freely. Each signup gets
//                                 a NEW tenant. Role='user' on it. No other
//                                 user can ever see this user's data. Used
//                                 for personal apps (finance, health, etc.).
//   multi_user_single_workspace – First signup claims super_admin of the
//                                 default tenant; subsequent signups require
//                                 an invitation into that same tenant. Used
//                                 for single-org enterprise deployments.
//   multi_user_multi_workspace  – Each signup creates a new tenant and
//                                 becomes its super_admin; their teammates
//                                 join via invitation into that tenant. Used
//                                 for self-serve B2B SaaS (Slack-shaped).

export type SignupMode =
  | 'single_user_shared'
  | 'single_user_isolated'
  | 'multi_user_single_workspace'
  | 'multi_user_multi_workspace';

export const SIGNUP_MODES: readonly SignupMode[] = [
  'single_user_shared',
  'single_user_isolated',
  'multi_user_single_workspace',
  'multi_user_multi_workspace',
] as const;

export const VALID_SIGNUP_MODES = new Set<SignupMode>(SIGNUP_MODES);

export const DEFAULT_SIGNUP_MODE: SignupMode = 'multi_user_single_workspace';

// Storage key on project_state.decisions. The v1.2.3 keys
// (signup_policy, signup_default_role) are not consumed anywhere after this
// change; hard cutover per locked decision (no projects exist yet to migrate).
export const SIGNUP_MODE_KEY = 'signup_mode_v1' as const;

export function isSignupMode(value: unknown): value is SignupMode {
  return typeof value === 'string' && VALID_SIGNUP_MODES.has(value as SignupMode);
}

// Human-readable labels for UI. Kept in this module so server and client
// share the same source of truth.
export const SIGNUP_MODE_LABELS: Record<SignupMode, string> = {
  single_user_shared:          'Single user, shared workspace',
  single_user_isolated:        'Single user, isolated workspaces',
  multi_user_single_workspace: 'Multi user, single workspace',
  multi_user_multi_workspace:  'Multi user, multi-workspace',
};

export const SIGNUP_MODE_DESCRIPTIONS: Record<SignupMode, string> = {
  single_user_shared:          'Anyone can sign up. All users share one workspace and can see each other\'s content.',
  single_user_isolated:        'Anyone can sign up. Each user gets a private workspace; no user sees another user\'s data.',
  multi_user_single_workspace: 'The first signup becomes the workspace owner. Everyone else joins by invitation.',
  multi_user_multi_workspace:  'Each signup creates their own workspace and becomes its owner. Teammates join by invitation.',
};
