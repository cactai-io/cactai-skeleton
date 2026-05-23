# src/components

Agent-generated React components live here.

The agent creates components during curriculum Stage 8 and open development mode.

## Conventions (enforced by the agent)

- No inline styles. All styling via CSS classes referencing `/config/theme/active.ts` tokens.
- Every file gets a header comment block stating what was generated, why, and which decisions drove it.
- No hardcoded colors, sizes, or font values — all reference design tokens.
- No direct Supabase queries — data fetching goes through `/src/app/api/` route handlers.
- Components are pure UI — no business logic. Business logic lives in API routes or tools.

## Structure

```
/components
  /ui          — primitive UI components (buttons, inputs, cards, modals)
  /layout      — layout components (navigation, shells, grids)
  /features    — feature-specific components (generated per feature)
```

The agent creates these subdirectories as needed.
