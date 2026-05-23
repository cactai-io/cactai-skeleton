# cactai-skeleton

This README describes your forked app. The Cactai platform handles initial provisioning, deployment, and updates — you do not clone or set up this template yourself. You only need to read this README to understand what the app does and how to customize it from inside the DevShell.

## What this is

When you complete the Cactai signup wizard, the platform:
1. Forks this repo into your GitHub account under a name derived from your app name
2. Creates a Vercel project linked to that fork
3. Sets all required environment variables in the Vercel project
4. Triggers the first deployment

After that, your fork is your app. You customize it from the `/dev` route (the DevShell) and via the Cactai platform `/settings` page; you do not need to clone the fork locally unless you want to.

## Structure

```
src/
  app/
    auth/           Supabase auth callback and login page
    app/            Routes for app users (tenants)
    dev/            DevShell — the AI development environment
    operate/        Operator panel for the developer to manage their app
    api/
      github/             Dev-branch commit + revert + file-tree endpoints. The commit route accepts the legacy patches shape AND the v1.2 multi-file shape. Threads 11/12: also returns 409 with a structured conflict payload when dev has diverged, accepts `resolved: true` retries, accepts `reverts_sha` for revert provenance, and honors `?simulateCommitConflict=1` in dev builds for end-to-end testing without engineering a real branch race. The revert route under github/revert/[sha] computes the inverse changeset from commit_log_files and forwards to /api/github/commit.
      pending/            v1.2 pending-edits staging: files (list/upsert), files/[path] (discard one), flush (beacon bulk upsert), and Thread 12's discard-all (bulk undo for the calling user).
      tree-with-pending/  Merged dev tree + pending overlay for the file panel
      history/            v1.2 commit history: commits (paginated list with time-range filters added in Thread 09) and commits/[sha]/files (per-commit detail)
      workflow/           Workflow state and backlog management
      settings/           Credentials and collaborators
      preview-url/        Server-side proxy for Vercel preview URL (keeps API key server-only)
  lib/
    auth.ts             Session detection and role routing
    cactai.ts           CactaiClient instantiation (server-only)
    supabase.server.ts  Server-side Supabase client (server-only)
    tokens.ts           Design token live-preview system (v1.2: migrated from sessionStorage to localStorage)
    pendingFiles.ts     v1.2 shared validators for the pending-edits routes and the multi-file commit branch
```

## NPM token setup

`@cactai-io/client` and `@cactai-io/mui` are private packages on the GitHub Packages registry. Your fork needs a token to install them.

The token is injected automatically as `CACTAI_NPM_TOKEN` in the Vercel project during provisioning. You do not need to do anything.

## Environment variables

See `.env.example` for the full list.

| Variable | Description |
|----------|-------------|
| `CACTAI_API_KEY` | Per-project API key from the Cactai dashboard. Server-only — never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_CACTAI_PROJECT_ID` | Your project ID. Safe to be public. |
| `ANTHROPIC_API_KEY` | Your Anthropic key. Server-only. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase REST URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key. Server-only. |
| `GITHUB_TOKEN` | PAT for reading/writing files in the app repo |
| `GITHUB_REPO_NAME` | `owner/repo` — set to your fork |
| `CACTAI_NPM_TOKEN` | GitHub Packages read token (injected during provisioning) |

## Database setup

Run the customer schema against your Supabase project once:
```bash
psql $SUPABASE_DATABASE_URL -f node_modules/@cactai-io/core/dist/schema/customer-supabase-schema.sql
```

## Role architecture

Two layers of roles:

Platform roles (`platform_roles` table): `dev` and `collaborator`. Set by the developer. Controls access to DevShell and `/operate`.

Tenant roles (`tenant_members` table): `super_admin`, `admin`, `user`. Per-tenant. Controls what app users can do inside the app.

The `/dev` route is for `dev` and `collaborator` roles. The `/app` route is for `super_admin`, `admin`, and `user` roles. The `/operate` route is for `dev` role on production deployments.

## DevShell

The DevShell is shipped by `@cactai-io/mui` and rendered at `/dev`. It is static Cactai-branded chrome wrapped around an app-shell content area that you build out through the chat thread; agent output is constructed server-side and rendered into the content window using the primitives in your fork's `primitives` folder.

v1.1 layout:

- Rail (left edge), four sections plus a chat toggle: Workspace, Build, Schema, Project settings. The Project settings rail icon's hover tooltip reads "Project settings — this app's workflow, available tools, available skills, providers, credentials, and collaborators."
- Files is not a rail section. In Dev view it is an always-on collapsible bottom panel owned by the shell.
- Build merges what were two separate rail sections in v1.0 (Capabilities + Marketplace) into one panel with `Installed | Browse` tabs.
- Workspace panel: project header and pending-edits trigger. The merge-to-main affordance was removed in the v1.2 commit-flow rebuild — developers merge dev to main manually in GitHub. Sprint goals and history live in Plan view.
- Project settings panel: per-project credentials and collaborators, plus a single outbound `Open developer settings ↗` link to the Cactai platform `/settings` page. Theme is not configured here in v1.1 — it's a per-developer preference owned by Platform `/settings#account`.
- Top bar, five elements left-to-right: brand + project + branch pill, Dev|Plan switcher, spacer, Preview-as picker (only when roles exist), avatar menu (rightmost). Commit flows are on the Files panel SyncIndicator + the Workspace panel header's "View pending edits" button when `branch === 'local'`. The v1.2 rebuild removed the state-aware commit-to-main button — when `dev · synced`, the header is empty.
- Avatar menu owns the theme tri-state controls and the Preview-as role list. Entries include `Platform dashboard ↗`, `Account settings ↗` (opens the Cactai platform `/settings` page in a new tab), `DevShell preferences` (theme controls and account-scoped preferences for this shell), `Theme inspector`, and sign out.

## v1.2 changes (project-library authoring + commit-flow rebuild)

This release does two things: (1) adds the on-disk home for developer-authored tools, skills, and workflows plus the loader that discovers and registers them at startup; (2) rebuilds the commit flow so every DevShell edit — chat-authored or editor-typed — goes through the same pending-edits → commit-to-dev review.

Project-library loader (unchanged from earlier in v1.2):

- `project-library/` — new directory at the repo root. Per-subdirectory READMEs (`tools/`, `skills/`, `workflows/`) document the file conventions.
- `src/lib/projectLibrary.types.ts`, `projectLibrary.validate.ts`, `projectLibrary.server.ts` — the loader. Scans `project-library/` on startup, validates each artifact against the relevant schema, and exposes the result through `loadProjectLibrary()` / `getLoadedTools()` / `getLoadedSkills()` / `getLoadedWorkflows()`.
- `src/tools/index.ts`, `src/skills/index.ts`, `src/workflows/index.ts` — registries that merge static-imported artifacts (existing agent-fill pattern) with loader-discovered ones.
- `docs/CHAT_PROTOCOL.md` — full reference for the conversational authoring protocol (`Load tool from … / Author a tool that …` and parallel skill/workflow variants).

Commit-flow rebuild (Tasks 1-5 of the v1.2 stage-2 work, see `changelog/TASK_1_TYPES.md` through `TASK_5_SKELETON_ROUTES_AND_MIGRATION.md` for per-task detail):

- The chat-side authoring path no longer auto-commits to git. Each successful Author/Load returns a `staged_file` on the turn result that lands as a pending row in the client staging module, alongside every other editor-originated edit. The skeleton-side `/api/project-library/route.ts` inventory endpoint is removed (the agent now reads from the merged dev tree + pending overlay via Supabase).
- New routes:
  - `GET / POST /api/pending/files` — list / upsert pending rows for the calling user.
  - `DELETE /api/pending/files/[path]` — discard one row.
  - `POST /api/pending/flush` — beacon-friendly bulk upsert for `navigator.sendBeacon` at tab close.
  - `GET /api/tree-with-pending` — merged dev tree + per-user pending overlay with `status` per node (`clean | modified | new | deleted | renamed | moved`).
  - `GET /api/history/commits` — paginated DevShell-originated commit list from `commit_log`.
  - `GET /api/history/commits/[sha]/files` — per-commit file detail with `original_content` / `current_content` snapshots for the inline diff in the history modal.
- `src/app/api/github/commit/route.ts` accepts two body shapes:
  - Legacy `{ patches, branch?, message }` — preserved for the `tokens.ts` config-patches flow (writes `skeleton.config.json` via `setDeep`).
  - New `{ files: [...], message }` — atomic multi-file commit via the GitHub trees + commits APIs handling all five operation types (`edit | create | delete | rename | move`) in one commit, then writes to `commit_log` + `commit_log_files` and clears the now-committed `pending_files` rows.
- `src/app/api/github/merge/route.ts` and `packages/mui/src/commit/CommitToMainModal.tsx` are deleted. Developers merge dev to main manually in GitHub.
- `src/lib/tokens.ts` migrated from `sessionStorage` to `localStorage` so token edits survive a refresh and broadcast cross-tab via the `storage` event. Same call sites, same commit-time read shape.
- `src/lib/pendingFiles.ts` — shared validators (`isPendingOperation`, `isValidRepoPath`, `validatePendingFileInput`) used by every pending-files route and the multi-file commit branch.

Schema (new migration `config/schema/0002_pending_edits.sql`):

- `pending_files` — per-user staging rows, PK `(user_id, path)`, FK to `app_users(id)`, CHECK constraints on `operation` and operation-specific shape (rename/move require `new_path`; delete requires `current_content IS NULL`; create requires `original_content IS NULL`). RLS scopes reads and writes per owner.
- `commit_log` — DevShell-originated commit headers, PK `commit_sha`, FK on `committer_id`. Indexed on `committed_at DESC` for paginated history. RLS allows any platform-role user to read; inserts gated by `committer_id = auth.uid()`.
- `commit_log_files` — per-commit file detail with `original_content` / `current_content` snapshots for the history modal's expandable diff. PK `(commit_sha, path)`, FK on `commit_sha` with `ON DELETE CASCADE`.

What's still in scope for the next thread (Tasks 6-13):

- Supabase-backed inventory replacement (Task 6) so the agent reads dev-authored artifacts through the same merged-tree + overlay surface.
- Pending-edits modal rebuild and a new `CommitHistoryModal` with inline diffs (Task 7).
- File-tree pending-overlay visuals — per-row badge + rename/move arrow indicator (Task 8).
- Role-view banner surfacing pending edits in non-dev viewports (Task 9).
- Vercel webhook + SSE + `DeployIndicator` for live deploy state (Task 10).
- Monaco-backed file editor with `FileConflictModal` for cross-tab edit collisions (Task 11).
- Inline `DiffViewer` shared between the modal and the editor (Task 12).
- Docs: `CHAT_PROTOCOL.md` updates and a new `COMMIT_FLOW.md` (Task 13).

See `companion/V1_2_HANDOFF_COMMIT_FLOW_REBUILD.md` for the full task list and design decisions.

## v1.2.1 — Stage 2, Tasks 6–13 complete

The skeleton-side surfaces that close out the v1.2 commit-flow rebuild:

- `docs/CHAT_PROTOCOL.md` rewritten for staged-not-committed semantics — Load/Author commands no longer write to git; they return a `staged_file` that the DevShell routes through the staging layer. New "Pending vs committed" section explains how the agent treats both.
- `docs/COMMIT_FLOW.md` new end-to-end doc covering the edit → stage → commit → deploy pipeline, the five operation types and their discard semantics, the two-shape commit body, the SSE deploy stream, the cross-tab/conflict resolution paths, and the live-vs-needs-deploy split.
- `src/lib/tokens.ts` migration to `localStorage` was completed in Stage 1; no further changes here.
- The skeleton routes for `pending/*`, `tree-with-pending`, `history/commits`, and the multi-shape `github/commit` are all already in place from Stage 1 and are unchanged. The platform-side wiring (Tasks 6–12) is what landed in this stage.

See `companion/V1_2_HANDOFF_COMMIT_FLOW_REBUILD.md` for the original task list and design decisions; this README's earlier Stage 2 section names the platform-side pieces by task number.

## v1.2.2 — Stage 3, Threads 09–12 (history filters, diff library, conflict resolution, revert)

Stage 3 layers four developer-facing capabilities on top of the commit pipeline finalized in v1.2.1. Every change is additive — earlier callers, body shapes, and database rows continue to work unchanged.

Thread 09 — commit history view extensions:
- `GET /api/history/commits` accepts three additional query params alongside the existing `before` pagination cursor:
  - `from` — ISO timestamp, inclusive lower bound on `committed_at`.
  - `to` — ISO timestamp, exclusive upper bound. The route computes the effective upper bound as `min(to, before)` so a paged request preserves the filter window.
  - `reverts_sha_eq` — exact match on the new `reverts_sha` column. Used to look up "was this commit reverted?" without a join.
- Every row in the response now carries `reverts_sha` (null on normal commits; set by Thread 12's revert flow). The history modal renders a `revert` pill on the row when present.
- The pagination contract is unchanged: clients pass the previous response's `next_cursor` as `?before=` and re-send `from` / `to` to keep the page consistent.

Thread 10 — diff viewer library:
- `packages/mui/src/diff/DiffViewer.tsx` (platform side) now lazy-loads `react-diff-viewer-continued` for the rich path and computes diffs via the `diff` package's `diffLines`. The inline pre-formatted fallback is preserved for SSR and tests via the `fallbackOnly` prop, and is also the Suspense fallback while the chunk downloads.
- Unified / side-by-side mode toggle in the toolbar; both packages are pinned in `packages/mui/package.json` and the package ships dark-theme styles bound to the platform's existing CSS variables.
- 500-line truncation with "Show all" preserved.
- `PendingFilesManager.diffLineCounts` delegates to `diff.diffLines` for line-count parity with the rich viewer.

Thread 11 — commit-time conflict resolution:
- `/api/github/commit` runs a pre-flight conflict pass after fetching the dev ref and before building the new tree. For each touched path it fetches dev's current content via the Contents API, then compares against the snapshot the local edit was based on (`pending_files.original_content` for edits/deletes, "must be empty" for creates, "source must match and dest must be empty" for renames/moves).
- When any path diverges, the route returns 409 with a structured body:
  ```json
  {
    "error":   "conflict",
    "message": "dev has changed since your local copy",
    "files":   [
      {
        "path":            "src/lib/x.ts",
        "operation":       "edit",
        "new_path":        null,
        "local_content":   "<the developer's pending content>",
        "base_content":    "<the snapshot the local edit was made against>",
        "remote_content":  "<what dev holds right now>",
        "remote_sha":      "<github blob sha>",
        "reason":          "remote_changed"
      }
    ]
  }
  ```
  `reason` is one of `remote_changed`, `create_collision`, `delete_remote_moved`, `rename_source_moved`, `rename_dest_taken`. The mui-side `CommitConflictModal` uses these to render reason labels and pick which three-way preview to show.
- Resolved retries set `body.resolved: true` so the route skips the pre-flight pass — the developer has already made the call.
- Dev-only test fixture: `POST /api/github/commit?simulateCommitConflict=1` is honored when `NODE_ENV !== 'production'` and fabricates a 409 conflict response from the request's file set without touching GitHub. Use it from the browser console while signed in: `fetch('/api/github/commit?simulateCommitConflict=1', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ files: [{ path: 'README.md', operation: 'edit', content: 'hi', last_edited_at: new Date().toISOString(), lines_added: 1, lines_removed: 0 }], message: 'test' }) }).then(r => r.json()).then(console.log)`. Production builds reject the parameter.

Thread 12 — revert + per-file undo:
- New schema migration `config/schema/0003_revert.sql` adds the `reverts_sha` column on `commit_log` (nullable; FK to `commit_log.commit_sha` with `ON DELETE SET NULL`) and a partial index on the non-null subset. Run it once against your Supabase: `psql $SUPABASE_DATABASE_URL -f config/schema/0003_revert.sql`. The migration is idempotent — re-running is safe.
- `POST /api/github/revert/[sha]` — given an original commit SHA, the route reads `commit_log` + `commit_log_files`, computes the inverse changeset (edits swap content, creates become deletes, deletes become creates, renames/moves swap path / new_path), and forwards the inverse to `/api/github/commit` with `reverts_sha = <original>`. The forwarded commit goes through the same conflict pre-flight as any other commit — if dev has moved such that the inverse can't apply cleanly, the developer routes through `CommitConflictModal` exactly like a normal commit conflict. Branch is always dev (the v1.2 architecture removed commit-to-main; main reverts are done by reverting on dev and merging dev → main manually in GitHub).
- `POST /api/pending/discard-all` — bulk undo. Deletes every `pending_files` row for the calling user. Idempotent (returns 204 with no body whether or not rows existed).
- Per-file undo: the file tree's hover-shown undo icon routes through a confirmation modal in DevShell before calling `onDiscardPendingFile`. The existing right-click "Restore" menu item stays confirmation-free (existing v1.1 behavior).

What's not in this stage (deferred to v1.3+ unless noted):
- Multi-commit revert (revert a range of commits).
- Cherry-picking commits between branches.
- Three-way merge tooling for multi-developer scenarios.
- Visual diff for non-text files (images, binary).
- Commits made outside the DevShell (git CLI, GitHub web UI) — still not in `commit_log`, still not shown in the history modal. Use the modal's "View on GitHub" link to see those.

