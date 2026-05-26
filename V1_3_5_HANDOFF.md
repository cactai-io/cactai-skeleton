# v1.3.5 — Skeleton hand-off for existing forks

The skeleton template adds three feature blocks in v1.3.5. New forks
(generated from `cactai-skeleton` after this point) pick them up
automatically. **Existing forks** — most notably
`Cactai-Inc/dreamjob-ai-app-app` on the `dev` branch — need the
files below copied across by hand. Apply against the fork's `dev`
branch, then merge to `main` along with whatever release cadence the
fork uses.

The platform API (cactai-platform) ships the server-side counterparts
of these features via the normal Fly deploy — nothing to do on the
platform side after the v1.3.5 release lands.

---

## Block 1 — DevShell preview auto-auth

Cross-origin handoff so the dashboard's "Open DevShell" CTA lands the
developer pre-authenticated at `/dev` (instead of the Supabase login).

### Files to copy (verbatim, no fork-specific edits needed)

- `src/app/api/preview-auth/route.ts` — GET handler that consumes the
  platform-minted token, calls Supabase admin `generateLink`, and
  302s into `/dev`. Production hard-gated via server-side
  `process.env.VERCEL_ENV === 'production' → 404`.

### Env vars required on Vercel

- `SUPABASE_SERVICE_KEY` — service-role key for the customer
  Supabase. Already required by the rest of the skeleton; no new
  variable.
- `NEXT_PUBLIC_CACTAI_API_BASE` — platform API base (e.g.
  `https://api.cactai.io`). Read via `endpoints.cactaiBase`. Existing.

### Verify after merge

1. From the platform dashboard click "Open DevShell" → preview opens
   already signed in at `/dev`.
2. Visit the preview URL directly without a token → Supabase login
   appears (no bypass).
3. Visit the production URL with a manually-crafted `?token=…` →
   404 (production gate).

---

## Block 2 — Thumbnail capture (dashboard project tiles)

Captures a JPEG of the DevShell (preview) and the login screen
(production) and uploads to the platform so the dashboard's project
card can show a live preview tile per environment.

### Files to copy

- `src/lib/capture-thumbnail.ts` — capture + upload helper. Uses
  `html-to-image`; calls
  `${cactaiBase}/v1/project-thumbnails/${projectId}` (open POST,
  rate-limited and size-capped at 200 KB on the server).
- `src/app/dev/_with-thumbnail.tsx` — client wrapper that mounts
  the platform DevShell and installs the capture handlers
  (sign-on + sign-off, `kind='preview'`).
- `src/app/dev/page.tsx` — replaced to render the new wrapper.
- `src/app/auth/login/page.tsx` — `useEffect` that installs capture
  handlers gated on `process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'`
  with `kind='production'`. The login UI itself is otherwise unchanged.

### package.json

Add to `dependencies`:

```json
"html-to-image": "^1.11.13"
```

Then `pnpm install` to refresh `pnpm-lock.yaml`.

### Verify after merge

1. Open the preview, log in, navigate around DevShell for a few
   seconds, then close the tab. Check the dashboard — the preview
   tile shows a thumbnail (5-minute browser cache).
2. Open the production URL (logged-out). The login screen is
   captured once on mount. Tile appears next to the preview tile.
3. Inspect Network: capture posts go to
   `/v1/project-thumbnails/:projectId` with payload ≤ 200 KB.

---

## Block 3 — (Documentation only)

No skeleton changes for the dashboard-shell / billing / etc. work in
v1.3.5 — those are platform-side only.

---

## Quick apply for `dreamjob-ai-app-app`

```bash
# From the dreamjob-ai-app-app working tree, dev branch checked out:
SK=path/to/cactai-skeleton  # local cactai-skeleton clone at v1.3.5

cp  "$SK/src/app/api/preview-auth/route.ts"  src/app/api/preview-auth/route.ts
cp  "$SK/src/lib/capture-thumbnail.ts"       src/lib/capture-thumbnail.ts
cp  "$SK/src/app/dev/_with-thumbnail.tsx"    src/app/dev/_with-thumbnail.tsx
cp  "$SK/src/app/dev/page.tsx"               src/app/dev/page.tsx
cp  "$SK/src/app/auth/login/page.tsx"        src/app/auth/login/page.tsx

# package.json: add "html-to-image": "^1.11.13" under dependencies,
# then:
pnpm install
git add -A
git commit -m "v1.3.5: preview auto-auth + thumbnail capture"
git push origin dev
```

After the push, the existing Vercel preview will rebuild with both
features. Promote to `main` on whatever cadence the fork uses.
