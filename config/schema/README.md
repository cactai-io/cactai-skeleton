# Customer Supabase schema (bundled copy)

The SQL files in this directory are the canonical customer-Supabase schema
used by `customer-bootstrap.ts` when provisioning a new developer's app.

**Do not hand-edit these files.** They are mirrors of the canonical source
at `cactai-skeleton/config/schema/`. Edits go in the skeleton repo;
the platform's `prebuild` script syncs the copy here.

The bundling exists so the platform's `apps/api` package is self-contained
at runtime — production deploys don't need the skeleton repo to be present
on the filesystem to bootstrap a customer DB.

## Sync workflow

```
# From the platform repo root, before each release:
npm -w @cactai-io/api run sync-schema

# Or, automatically as part of build:
npm -w @cactai-io/api run build
```

The `sync-schema` script reads from `../../cactai-skeleton/config/schema/`
and writes here, failing loudly if any expected file is missing.
