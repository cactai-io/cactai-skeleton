# cactai-skeleton

The template every Cactai app starts from. Use it as a **GitHub template**
(the Cactai setup wizard creates your repo from it during provisioning) — do
not fork it.

## What this is

A thin developer app:

- **Your app** — Next.js routes under `src/app/` that you own and grow.
- **`cactai.config.json`** — your app's declared shape. Provisioning writes
  `tenancy` (`multi` | `single`) from your setup-wizard answer and prunes the
  template to match (both variants ship prune-marked; exactly one survives).
- **AppShell host** — `@cactai-io/shell-ui` chrome around your app's GAS
  mount; the primitive tree renders via `@cactai-io/primitives`.
- **Platform client** — `@cactai-io/platform-client` with your per-project
  key (`CACTAI_API_KEY`, server-only). All intelligence is platform-side;
  no Cactai private source ships in this repo, ever (D-T68).
- **Sign in with Cactai** — `@cactai-io/identity-client`; the app-side token
  is pairwise-pseudonymous (your app never sees a cross-app identity).
- **PWA packaging** — web manifest + service worker; installable standalone.
- **Customer DB template** — `config/schema/` (pruned to your tenancy, then
  applied to your database by provisioning).

## Setup

Provisioning does this for you; by hand:

1. `cp .env.example .env.local` and fill in the values from your Cactai
   Console project (the per-project key is minted there).
2. `pnpm install` — `@cactai-io/*` installs from GitHub Packages via the
   scoped `.npmrc` (set `CACTAI_NPM_TOKEN`, a read-only token with
   `read:packages`).
3. `pnpm dev`.

## Tenancy variants (D-T80)

The template carries BOTH variants, selected at provisioning:

- **multi** — tenant tables + per-tenant RLS from day one; role hierarchy
  app-owner → tenant-admin → user; the in-app user portal is a tenant-admin
  surface. Tenant creation/suspension lives in the owner's platform-hosted
  Console control plane, never in-app.
- **single** — no tenant layer; app-owner → user; owner user portal.
