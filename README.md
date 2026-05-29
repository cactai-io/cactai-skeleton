# Your Cactai app

This README describes your app. The Cactai platform handles initial provisioning, deployment, and updates — you do not clone or set this template up yourself. Read this to understand what the app does and how to customize it from inside the DevShell.

## What this is

When you complete the Cactai signup wizard, the platform:

1. Creates a fresh GitHub repository in your account from the Cactai skeleton template.
2. Creates a Vercel project linked to that repository.
3. Sets every environment variable the app needs.
4. Triggers the first deployment.

After that, the repo is yours. You customize it from the `/dev` route (the DevShell) and via the platform `/settings` page; you do not need to clone the repo locally unless you want to.

## Structure

```
src/
  app/
    auth/              Supabase auth callback and login page
    app/               Routes for end users (tenants)
    dev/               DevShell — the AI development environment
    operate/           Operator panel for the app owner
    api/
      github/          Commit, revert, and file-tree endpoints
      pending/         Pending-edits staging routes
      tree-with-pending/  Merged dev tree + pending overlay for the file panel
      history/         Commit history endpoints
      workflow/        Workflow state and backlog management
      settings/        Credentials and collaborators
      preview-url/     Server-side proxy for Vercel preview URL
      preview-auth/    Cross-origin DevShell sign-in handoff from the Cactai dashboard
  lib/
    auth.ts            Session detection and role routing
    cactai.ts          CactaiClient instantiation (server-only)
    supabase.server.ts Server-side Supabase client (server-only)
    tokens.ts          Design-token live-preview system (localStorage-backed, cross-tab)
    pendingFiles.ts    Shared validators for pending-edits routes + multi-file commits
```

## Environment variables

The platform sets every variable below on the Vercel project at provision time. See `.env.example` for the canonical list.

| Variable | Description |
|---|---|
| `CACTAI_API_KEY` | Per-project API key. Server-only — never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_CACTAI_PROJECT_ID` | Your project ID on the Cactai platform. Safe to expose to the browser. |
| `NEXT_PUBLIC_CACTAI_BASE_URL` | Cactai platform API URL (browser-readable). |
| `CACTAI_BASE_URL` | Same as above, server-side reads. |
| `ANTHROPIC_API_KEY` | Your Anthropic key. Server-only. |
| `OPENAI_API_KEY` | Your OpenAI key (optional). Server-only. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase REST URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. |
| `SUPABASE_SERVICE_KEY` | Supabase service role key. Server-only. |
| `GITHUB_TOKEN` | PAT for reading/writing files in the app repo. |
| `GITHUB_REPO_NAME` | `owner/repo` — your app's GitHub repository. |
| `CACTAI_NPM_TOKEN` | GitHub Packages read token for `@cactai-io/*` private packages. |

## Role architecture

Two role layers, each on a different table on your Supabase:

- **`platform_roles`** — values `dev`, `collaborator`. Controls who can use the DevShell and the operator panel. The first user who reaches the app via DevShell handoff (you) is granted `dev`. Collaborators you invite from the operator panel get `collaborator`.
- **`tenant_members`** — values `super_admin`, `admin`, `user`. Per-tenant authorization for end-user activity inside the app. The first user to sign up at production claims the default tenant and becomes `super_admin`.

Route-to-role mapping:

- `/dev` — DevShell IDE. Requires `platform_role IN ('dev','collaborator')`.
- `/operate` — Operator panel. Requires `platform_role = 'dev'`.
- `/app` — End-user routes. Gated by `tenant_members` membership.

## DevShell

The DevShell is the in-app IDE, shipped by `@cactai-io/mui` and rendered at `/dev`. It is Cactai-branded chrome wrapped around an app-shell content area you build out through the chat thread. Agent output is constructed server-side and rendered into the content window via your fork's `primitives` folder.

Top-level layout:

- **Rail** (left edge) — Workspace, Build, Schema, Project settings.
- **Files** — always-on collapsible bottom panel owned by the shell.
- **Top bar** — brand + project + branch pill on the left, `Dev | Plan` switcher, Preview-as role picker (when roles exist), avatar menu on the right.
- **Workspace panel** — project header and pending-edits trigger. Plan view holds sprint goals and history.
- **Build panel** — `Installed | Browse` tabs covering capabilities and the marketplace.
- **Project settings panel** — per-project credentials, collaborators, and an outbound link to the platform `/settings` page.
- **Avatar menu** — theme tri-state, Preview-as role list, `Platform dashboard ↗`, `Account settings ↗`, `DevShell preferences`, `Theme inspector`, and sign out.

Commits originating from the DevShell go through the standard edit → stage → commit → deploy pipeline. Pending edits live in `pending_files`; committed edits write to `commit_log` + `commit_log_files`. The file tree shows per-row status (`clean | modified | new | deleted | renamed | moved`) and a hover undo for pending rows. Commits made outside the DevShell (`git` CLI, GitHub web UI) appear on GitHub but not in the DevShell history modal — use the modal's "View on GitHub" link to see those.

## Getting help

- **Platform dashboard:** [dashboard.cactai.io](https://dashboard.cactai.io) — billing, project settings, providers, support inbox.
- **Schema migrations:** Applied automatically by the platform at provision time. New migrations ship as platform updates.
- **Sign-in problems on the deployed app:** Check that your Supabase project's URL Configuration → Site URL and Redirect URLs include your Vercel preview and production patterns. The wizard sets these automatically when you provide a Supabase Personal Access Token; if you skipped that step, add them manually in Supabase Studio.
