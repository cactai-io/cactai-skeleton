# Pruning Manifests

The pruning system turns the maximal skeleton repo into the minimal subset
each developer's app actually needs. Stage 1's Agent SDK dispatch reads
the resolved profile + orthogonal flag set, finds the matching `@prune:*`
markers in the skeleton source files (now living in the developer's fork),
and removes the marked blocks.

This document is the authoritative reference for:

- The four base profiles (Gap 10, 17)
- The orthogonal flag markers — auth, payments, marketplace, AI (Gap 11)
- The `@prune:ai.*` marker taxonomy covering every AI subsystem (Gap 32)
- How the PruneExecutor compiles the manifest into a concrete prune plan

The companion data lives in `profiles/*.ts` — TypeScript modules that
list file deletions and marker prefixes per profile.

---

## Base Profiles

A base profile is the largest contiguous set of files that all apps with
the same tenancy + collaboration shape share. There are FOUR profiles in
v1.3. The earlier "mumt + collab=off is invalid" rule has been removed —
mumt + solo is now a first-class profile with its own manifest.

### `mumt_collab` — Multi-user, multi-tenant, collaboration enabled

Default for team apps like HubSpot, Salesforce, Jira. Keeps:

- Multi-tenant data model (`tenants`, `tenant_members`, `tenant_invitations`)
- Role catalog with `super_admin`, `admin`, `user`, `viewer` and the
  capability matrix machinery
- Tenant-shared workspaces — users see each other's work
- Invitation flow, activity feed, comment threads, presence indicators

### `mumt_solo` — Multi-user, multi-tenant, collaboration disabled (Gap 10, 17)

NEW in v1.3. For team apps where each member has their own workspace
under the tenant umbrella but they don't share work. The tenant exists
for billing / admin / role assignment; workspaces are individual.

Keeps everything `mumt_collab` keeps EXCEPT:

- Activity feed
- Comment threads
- Presence indicators
- Workspace-shared resources (each user has their own)

Auth, invitations, role catalog, and the tenant model are all retained
because the multi-user side still functions.

### `sumt` — Single-user

For apps like Strava, Duolingo, Instagram. Each user has their own
account; no team structure. Prunes the entire multi-tenant data model
(no `tenants`, `tenant_members`, `tenant_invitations`), the role catalog,
and all admin-tier UI.

`pruning.collaboration` is ignored for single-user apps — solo is the
only sensible mode and any "sharing" UI a single-user app needs (e.g.
a "share a link to this demo" feature) is implemented at the feature
level, not via the collaboration system.

### `both` — Hybrid (both single-user and multi-user modes coexist)

For apps like Notion, 1Password, Figma where a user can be solo or
join a team. Keeps the full mumt_collab surface AND the sumt surface;
each user's `app_metadata.tenancy_mode` decides which lens applies on
sign-in.

Heavier than the other profiles but the only way to ship genuine
hybrid apps.

---

## Profile Resolution

The PruneExecutor resolves the BuildManifest into a profile via:

```
manifest.pruning.tenancy + manifest.pruning.collaboration → profile

  mumt + collab  → mumt_collab
  mumt + solo    → mumt_solo
  sumt + (any)   → sumt
  both + collab  → both
  both + solo    → both        (the sumt lens of `both` carries solo
                                semantics; collab on the mumt lens is
                                kept for users who want a team mode)
```

Profile resolution is deterministic. The executor reads the two manifest
fields and picks one of the four profile records from `profiles/index.ts`.

---

## Orthogonal Flag Markers (Gap 11)

A profile sets the broad shape. Orthogonal flags refine it across
dimensions that vary independently of tenancy: auth methods, payment
processors, marketplace presence, AI subsystem. Each flag controls a
set of `@prune:*` markers in the skeleton source.

### Marker syntax

Markers are TypeScript / SQL comments that the executor reads and
removes (along with the code they enclose) when the corresponding flag
is unset:

**Block form** (multi-line):

```ts
// @prune:flag-name:start
const someCode = ...;
import someThing from '...';
// @prune:flag-name:end
```

**Single-line form**:

```ts
// @prune:flag-name
import OptionalThing from '...';
```

The executor walks the file, finds matching start/end pairs (or single-
line markers), and removes the marker comments + the lines they enclose.
Files with no markers are untouched; files with all-marker content are
deleted entirely.

### Auth markers

One marker per supported auth method. The flag is unset when the method
is NOT in `manifest.pruning.auth_methods`.

| Marker | Removed when |
|---|---|
| `@prune:auth.email_password` | `email_password` not in `auth_methods` |
| `@prune:auth.magic_link`     | `magic_link` not in `auth_methods` |
| `@prune:auth.google`         | `google` not in `auth_methods` |
| `@prune:auth.apple`          | `apple` not in `auth_methods` |
| `@prune:auth.github`         | `github` not in `auth_methods` |

### Invitation markers

| Marker | Removed when |
|---|---|
| `@prune:invitations`            | `access_model === 'open'` (no invites at all) |
| `@prune:invitations.supabase`   | `invitation_delivery !== 'supabase'` |
| `@prune:invitations.resend`     | `invitation_delivery !== 'resend'` |
| `@prune:invitations.manual`     | `invitation_delivery !== 'manual'` |

### Marketplace + payments markers

| Marker | Removed when |
|---|---|
| `@prune:marketplace`            | `marketplace === 'no'` |
| `@prune:payments`               | `payments === 'no'` |
| `@prune:payments.stripe`        | `stripe` not in `payment_processors` |
| `@prune:payments.block`         | `block` not in `payment_processors` |

### Collaboration markers (within mumt)

| Marker | Removed when |
|---|---|
| `@prune:collab.feed`     | `collaboration === 'solo'` AND tenancy is mumt |
| `@prune:collab.comments` | same |
| `@prune:collab.presence` | same |
| `@prune:collab.sharing`  | same |

These markers are how `mumt_solo` differs from `mumt_collab` — the
profile decides whether they fire; the markers themselves are the same
list of code locations in the skeleton.

---

## AI Subsystem Markers (Gap 32 — `@prune:ai.*`)

The AI subsystem has the most fine-grained marker set because the manifest
exposes per-provider, per-feature, and per-integration-mode toggles. The
executor reads `manifest.pruning.ai_integration`, `ai_providers`, and
`ai_features` and prunes everything that doesn't apply.

### Top-level AI

| Marker | Removed when |
|---|---|
| `@prune:ai` | `ai_integration === 'none'` — entire AI subsystem off |

When this fires, EVERY `@prune:ai.*` marker also fires (the executor
treats `@prune:ai` as a parent that subsumes children) and the following
specific deletions are also performed:

- Delete `/src/lib/gas/**` (GAS engine integration)
- Delete `/src/app/api/agent/**` (AI route handlers)
- Delete `/src/app/api/operate/ai-configuration/**` (no model selector)
- Delete `/src/app/operate/ai-configuration/**` (no AI config page)
- Delete `/src/components/chat/**` (generative chat UI)
- Delete `/src/components/character/**` (animated character UI)
- Delete `/src/lib/personality/**` (personality config)

### GAS engine

| Marker | Removed when |
|---|---|
| `@prune:ai.gas_engine`  | `ai_integration === 'none'` (covered by parent) |

Marks the imports / wiring between the developer's app and the platform's
GAS engine — `/v1/shell/turn` callers, session creation, etc.

### Tool registrations

| Marker | Removed when |
|---|---|
| `@prune:ai.tools`               | `ai_integration === 'none'` |
| `@prune:ai.tools.ai`            | no `ai.*` tools needed (text_chat, summarize, etc. absent) |
| `@prune:ai.tools.media`         | `media generation` features absent |
| `@prune:ai.tools.web`           | `web fetch / extract` features absent |
| `@prune:ai.tools.code`          | author/refactor tools not needed (most non-DevShell apps) |

### Route handlers

| Marker | Removed when |
|---|---|
| `@prune:ai.routes`              | `ai_integration === 'none'` |
| `@prune:ai.routes.byok`         | BYOK not enabled (`ai_integration !== 'byok' && !== 'both'`) |
| `@prune:ai.routes.developer_paid` | developer-paid not enabled (`ai_integration === 'byok'`) |

### Generative chat

| Marker | Removed when |
|---|---|
| `@prune:ai.chat`                | `text_chat` not in `ai_features` |
| `@prune:ai.chat.streaming`      | chat is off OR streaming isn't a feature |

### Provider-specific

| Marker | Removed when |
|---|---|
| `@prune:ai.provider.openai`     | OpenAI not in `ai_providers` |
| `@prune:ai.provider.anthropic`  | Anthropic not in `ai_providers` |
| `@prune:ai.provider.other`      | No `other` providers configured |

### Feature-specific

| Marker | Removed when |
|---|---|
| `@prune:ai.feature.image_generation`        | not in `ai_features` |
| `@prune:ai.feature.audio_transcription`     | not in `ai_features` |
| `@prune:ai.feature.document_analysis`       | not in `ai_features` |
| `@prune:ai.feature.embeddings_semantic_search` | not in `ai_features` |

### UI surfaces

| Marker | Removed when |
|---|---|
| `@prune:ai.byok_ui`            | BYOK not enabled — no settings form for end-user keys |
| `@prune:ai.character`          | `ai_integration === 'none'` — no Ember/SAM/Milo |
| `@prune:ai.personality`        | `ai_integration === 'none'` — no personality config |
| `@prune:ai.model_selector`     | `ai_integration === 'none'` — no Sonnet/Opus picker |

---

## Prune Plan Compilation

The PruneExecutor compiles a `PrunePlan` for the Agent SDK dispatch:

```ts
interface PrunePlan {
  profile:        ProfileId;              // mumt_collab | mumt_solo | sumt | both
  file_deletions: string[];               // absolute repo-relative paths
  marker_flags: {
    [flag: string]: 'remove' | 'keep';    // every marker the skeleton defines
  };
  commit_message: string;                 // chore: prune skeleton to <profile> profile
  claude_md:      string;                 // generated CLAUDE.md content
}
```

The plan is included in the Agent SDK task's `decisions` payload + the
task prompt. The agent's job is to walk the skeleton (via the GitHub
MCP server), apply the deletions + marker removals, and write CLAUDE.md
— all within a single per-task branch that squash-merges to `dev`.

The executor itself does NOT modify files. The agent does the writing
through its MCP tools so the platform doesn't need a clone.

---

## Failure modes

- **Unknown marker** — the executor builds a complete flag set; the
  agent reports the marker in `unknown_markers` and the dispatch
  fails with `error: 'unknown_marker:<name>'`. The skeleton author
  should update either this doc or the skeleton source so they match.

- **Orphan start without end** (or vice-versa) — the agent reports the
  filename + line. Dispatch fails; the branch is retained for the
  skeleton author to inspect.

- **Profile resolution fails** — manifest field is null. The executor
  refuses to dispatch and returns `{ ok: false, reason:
  'tenancy_or_collaboration_unconfirmed' }`. The DevShell orchestrator
  surfaces the error and re-walks the pruning step.

---

## Adding a new profile

1. Add a `profiles/<id>.ts` module exporting a `ProfileManifest`.
2. Register it in `profiles/index.ts`.
3. Update `resolveProfile.ts`'s resolver if the new profile is reached
   by manifest fields not already handled.
4. Add `@prune:*` markers in the skeleton source where the new profile's
   behavior differs from existing ones.
5. Update this document with the new profile's keep/strip semantics.

## Adding a new orthogonal flag

1. Document the marker name in this file under the appropriate section.
2. Update `resolveProfile.ts` so the manifest field maps to the flag
   value.
3. Add the markers in the skeleton source.
4. No code change needed in the PruneExecutor — flags are data-driven.
