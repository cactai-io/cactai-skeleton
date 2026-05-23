# DevShell Commit Flow

This document describes how edits made in the DevShell move from the local browser session to the dev branch on GitHub. It covers staging, the five operation types, the commit-to-dev path, deploy events, and how the role-view's live preview relates to all of it.

The v1.2 commit-flow rebuild reshaped this pipeline end-to-end. The auto-commit and commit-to-main paths are gone. Every edit — whether typed into the Monaco editor, produced by a chat-side Author/Load, or made via a file upload — now flows through the same staging layer and the same atomic commit-to-dev endpoint.

## Edit → stage → commit → deploy

The flow in order:

1. **Edit** happens in one of four places:
   - The Monaco file editor (typing into a file).
   - The file tree's right-click "Restore" / discard-equivalent affordances.
   - A chat-side `Author` or `Load` command, which returns a `staged_file` payload on the turn result.
   - A token edit from the chat (`setToken` in `src/lib/tokens.ts`) — these go through the legacy config-patches path of the commit route and bypass `pending_files` entirely.

2. **Stage**: the client staging module (`packages/mui/src/staging/PendingFilesManager.ts`) writes synchronously to `localStorage` and schedules a debounced flush to the developer's Supabase. The debounce is 30 seconds per path with a 240-second max-interval cap; discrete events (Author/Load/upload/rename/delete) bypass the debounce. A best-effort `navigator.sendBeacon` flush fires on `visibilitychange: hidden` and `beforeunload`.

3. **Review**: the developer opens the pending-edits modal from the file-tree panel header. Each pending row shows an operation badge (edit/create/delete/renamed/moved), the path (with `→ new/path` for rename/move), a diff summary `+N / -M`, and an expand chevron for the inline diff. Per-row discard and a global "Discard all" affordance are available.

4. **Commit**: clicking "Commit selected to dev" or "Commit all to dev" calls `POST /api/github/commit` with the v1.2 multi-file body shape. The route resolves each file's content from the request body or from `pending_files`, then makes one atomic git commit through the GitHub `git/trees` + `git/commits` APIs. After GitHub returns the new commit SHA, the route writes to `commit_log` + `commit_log_files` so the history modal can render the commit later, then clears the committed `pending_files` rows.

5. **Deploy**: GitHub's push triggers Vercel to rebuild the dev branch. Vercel fires a `deployment.*` webhook to the platform's `POST /webhooks/vercel/deployment`. The platform validates the HMAC signature against the project's `vercel_webhook_secret`, then fans the event out to every DevShell currently subscribed to that project's SSE stream at `/v1/projects/<id>/deploy-events`.

6. **Reload**: when the DevShell sees a `ready` deploy event, the DeployIndicator turns green, pauses 500 ms, and calls `window.location.reload()`. The reload re-fetches the tree, `pending_files`, `commit_log`, and the role-view re-mounts against the now-deployed code.

## Five operation types

The pending-edits layer supports five operation types. Each has its own discard semantics and its own visual treatment in the file tree.

### edit

The file exists on dev; its content has changed locally. The pending row carries `original_content` (the dev-branch text) and `current_content` (the local text). Tree: standard pending dot indicator on the row. Discard: restore `current_content := original_content`, recompute diff, and — since the diff is necessarily zero — evict the row.

### create

The file did not exist on dev. The pending row carries `current_content` only (`original_content` is null). Tree: green plus icon next to the filename. Discard: remove the row entirely; the file disappears from the tree.

### delete

The file existed on dev and is marked for removal. The pending row carries `original_content` only (`current_content` is null). Tree: 50% opacity + strikethrough on the filename. Hover tooltip: "Will be removed on commit. Right-click to restore." Discard: remove the row; the file returns to its un-greyed state in the tree. After commit, the file is no longer in the dev branch and the next tree fetch simply doesn't include it.

### rename

The file existed on dev at `path`; the developer renamed it to `new_path`. Tree: the file appears at its new path with a "renamed" badge; the old path is shown grayed-out with a "→ new/path" indicator. Hover tooltip on the old slot: "Will be renamed to `<new_path>` on commit. Right-click to restore." Discard: remove the row; the file returns to its original path.

### move

Same shape as rename. Distinguished from rename so the modal can label the badge "moved" when the change is purely a directory move.

## The commit route's two body shapes

`POST /api/github/commit` accepts two shapes and dispatches accordingly:

- **Legacy patches** (`{ patches, branch, message }`): the historical config-token path. Reads `skeleton.config.json` from dev, applies the dot-path patches via `setDeep`, writes the file back as a single Contents-API commit. The `branch` parameter is ignored if it's not `dev` — commit-to-main is gone.

- **v1.2 multi-file** (`{ files: [...], message }`): a list of file operations. Each entry carries `{ path, operation, new_path?, content?, last_edited_at, lines_added, lines_removed }`. The route resolves content from the request body when present and from `pending_files` when omitted. It then issues:
  1. `POST /git/blobs` for each file that gets content (edits, creates, and the new-path side of rename/move).
  2. `POST /git/trees` with `base_tree` set to the parent tree's SHA. Each tree entry either points at a new blob SHA (write) or sets `sha: null` (deletion). Rename/move emits two entries — a deletion at the old path and a write at the new path.
  3. `POST /git/commits` with the new tree SHA and the parent commit SHA.
  4. `PATCH /git/refs/heads/dev` to fast-forward the branch.
  5. `INSERT` rows into `commit_log` and `commit_log_files` for the history modal.
  6. `DELETE` the committed rows from `pending_files`.

All operation types land in one atomic git commit. There's exactly one commit per "Commit" button click, regardless of how many files were selected.

The commit body never accepts a `branch` parameter. The dev branch is always the target. The legacy shape's `branch` field is preserved on the schema for back-compat but ignored beyond `dev`.

## Live preview vs needs-deploy

Code edits (`*.ts`, `*.tsx`, `*.py`, etc.) require a Vercel rebuild before they appear in the role-view. Config-token edits and `skeleton.config.json` patches DO preview live — they're CSS-variable substitutions or runtime-read config, applied to the same React tree the role-view renders.

The DevShell communicates this in three places:

1. **File-tree row indicator**: each pending row carries a small dot to the right of the operation badge. Green = previews live in the role-view. Amber = code change; previews only after Vercel deploys. The classifier is `previewBehaviorFor(path)` in `packages/mui/src/commit/types.ts`; it treats `skeleton.config.json`, `config/theme/*`, and `config/design/*` as live, everything else as needs-deploy.

2. **Role-view banner**: when the developer is viewing a file or page in role-view that has a pending non-config code edit, a non-intrusive banner at the top of the role-view reads: "You have pending code changes that aren't in this preview. Commit and wait for the deploy to see them." Dismissible per session.

3. **Editor header indicator**: the Monaco editor's header shows the same live/needs-deploy status for the file currently being edited.

All three surfaces share the same `previewBehaviorFor` classifier, so they agree by construction.

## Deploy events

The platform's deploy-events stream is per-project SSE at `/v1/projects/<id>/deploy-events`. The DevShell opens this on mount with a bearer token (the developer's API key) and listens for:

- `event: open` — sent once after the subscription is registered. Lets the client confirm the stream is live.
- `event: deploy` — one per Vercel deploy state transition. Payload: `{ state, deploy_id, timestamp, vercel_url? }` where state is one of `'building' | 'ready' | 'error' | 'canceled'`.
- `event: heartbeat` — every 15 seconds. Empty data; keeps the connection alive through proxies.

The webhook handler at `POST /webhooks/vercel/deployment` validates HMAC against the per-project secret (`projects.connections.vercel_webhook_secret`), maps Vercel's event type to our `DeployState` taxonomy, and calls `publishDeployEvent(projectId, event)`. The fan-out is in-process; a v1.2 cluster runs as a single Hono replica per region and that's fine for the scale we're operating at.

The DeployIndicator at the top of the Files panel turns:

- **grey** at first paint (state unknown).
- **amber** with a subtle pulse while `building`.
- **green** when `ready`. 500 ms later the page reloads.
- **red** when `error`, with a tooltip and a click-through to the Vercel dashboard.

## Commit history

The commit-history modal is opened from the pending-edits modal's footer link ("View commit history"). It calls `GET /api/history/commits?before=<ISO>` (paginated, 20 per page) and renders one group per commit, reverse-chronological. Each group shows:

- Date, short SHA, message in the header.
- Files within the group, sorted by `last_edited_at` descending.
- Each file row carries an operation badge + path (with `→ new/path` for rename/move) + diff summary.
- Edit/create/delete rows are expandable to show inline diff via `DiffViewer`. The diff renders from `original_content` / `current_content` snapshots that the commit route persisted to `commit_log_files` — no re-fetch from GitHub is needed.

The modal's footer has a "View on GitHub" deep-link to the dev branch's commit list on the developer's fork.

**Only DevShell-originated commits appear here.** Commits made via the git CLI or the GitHub web UI are not recorded in `commit_log` and are invisible to this modal. The dev branch on GitHub remains the absolute source of truth; this modal is a convenience for the editing workflow.

## Cross-tab edits

The staging layer is cross-tab safe. Two DevShell tabs open on the same project share `localStorage` and listen for the `storage` event. When tab A writes a pending edit, tab B's `PendingFilesManager` receives the event, updates its in-memory view, and notifies subscribers. The Monaco editor uses this to render a banner on the file currently open: "This file is being edited in another tab. Reload to see those changes or continue editing here."

The Supabase layer is debounced; the `storage` event arrives faster, so the cross-tab sync is the dominant signal in practice. The Supabase round-trip is the durability backstop.

## File conflicts

When the editor opens a file, it checks both `localStorage` and the Supabase `pending_files` row. If both exist with different content, the editor opens `FileConflictModal` instead of mounting Monaco directly. Two columns show "On this device" vs "From another session or device" with previews + timestamps + full-diff and copy-to-clipboard affordances. Four resolution paths:

- **Keep this device's version** — `localStorage` wins; Supabase is overwritten.
- **Keep the other version** — Supabase wins; `localStorage` is overwritten.
- **Keep both** — the non-primary version is saved under `<original-path>.conflict-<ISO-timestamp>.<ext>` as a new `pending_files` entry with `operation: 'create'`. The primary version stays at the original path.
- **Cancel** — closes; both versions remain intact. The editor does not open the file.

Identical content on both sides auto-resolves; the modal never appears.

## Auto-empty-diff revert

When a developer edits a file back to its dev-branch original byte-for-byte (lines_added + lines_removed both zero), the pending row auto-evicts. The next debounce tick observes the zero diff in `setPendingFile()` and routes through `discardPendingFile()` instead. This keeps `pending_files` clean of empty-diff rows that would otherwise survive until commit.

## Where the code lives

- `cactai-platform-repo/packages/mui/src/staging/PendingFilesManager.ts` — client staging module.
- `cactai-platform-repo/packages/mui/src/commit/PendingEditsModal.tsx` — pending modal.
- `cactai-platform-repo/packages/mui/src/commit/CommitHistoryModal.tsx` — history modal.
- `cactai-platform-repo/packages/mui/src/commit/DeployIndicator.tsx` — SSE-driven indicator.
- `cactai-platform-repo/packages/mui/src/commit/SyncIndicator.tsx` — local/dev branch indicator.
- `cactai-platform-repo/packages/mui/src/commit/types.ts` — `SyncState`, `previewBehaviorFor`, shared types.
- `cactai-platform-repo/packages/mui/src/components/FileTree.tsx` — tree with v1.2 status overlays.
- `cactai-platform-repo/packages/mui/src/diff/DiffViewer.tsx` — unified diff renderer.
- `cactai-platform-repo/packages/mui/src/editor/MonacoFileEditor.tsx` — Monaco multi-tab editor.
- `cactai-platform-repo/packages/mui/src/editor/FileConflictModal.tsx` — conflict resolver.
- `cactai-platform-repo/packages/mui/src/role/RoleViewBanner.tsx` — role-view banner.
- `cactai-platform-repo/apps/api/src/project-library/SupabaseProjectLibraryInventory.ts` — agent inventory.
- `cactai-platform-repo/apps/api/src/routes/deploy-events.ts` — SSE endpoint.
- `cactai-platform-repo/apps/api/src/routes/webhooks.ts` — Vercel webhook + HMAC + fan-out.
- `cactai-skeleton/src/app/api/pending/files/route.ts` — pending CRUD.
- `cactai-skeleton/src/app/api/pending/files/[path]/route.ts` — per-row discard.
- `cactai-skeleton/src/app/api/pending/flush/route.ts` — beacon flush.
- `cactai-skeleton/src/app/api/tree-with-pending/route.ts` — route-side tree+overlay merge.
- `cactai-skeleton/src/app/api/history/commits/route.ts` — paginated commit list.
- `cactai-skeleton/src/app/api/history/commits/[sha]/files/route.ts` — files per commit.
- `cactai-skeleton/src/app/api/github/commit/route.ts` — atomic multi-file commit-to-dev.
- `cactai-skeleton/config/schema/0002_pending_edits.sql` — `pending_files`, `commit_log`, `commit_log_files`.
