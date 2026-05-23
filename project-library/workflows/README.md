# project-library/workflows/

One JSON file per workflow. Filename should match the workflow's `id` (e.g. `onboarding-flow.json` for `id: "onboarding-flow"`).

Each file is a single `WorkflowDefinition` object — see the `WorkflowDefinition` and `WorkflowStep` types in `@cactai-io/types`.

Minimal example:

```json
{
  "id":          "onboarding-flow",
  "name":        "User onboarding",
  "description": "Walk a new user through account setup, preferences, and first action.",
  "schema_version": 1,
  "steps": [
    {
      "id":      "welcome",
      "label":   "Welcome",
      "prompt":  "Greet the user and explain what they're about to set up.",
      "tools":   [],
      "skills":  ["chat_thread"]
    },
    {
      "id":         "preferences",
      "label":      "Preferences",
      "prompt":     "Ask about notification, theme, and language preferences.",
      "depends_on": ["welcome"],
      "tools":      [],
      "skills":     ["form"]
    },
    {
      "id":         "complete",
      "label":      "Done",
      "prompt":     "Confirm setup and point the user at their dashboard.",
      "depends_on": ["preferences"],
      "tools":      [],
      "skills":     ["chat_thread"]
    }
  ]
}
```

Validation enforces:

- `schema_version` is `1` (unknown versions are rejected, not guessed at).
- `id` is unique within the workflow registry.
- Every step `id` is unique within its workflow.
- Every entry in `depends_on` resolves to a sibling step's id.
- The dependency graph is acyclic.

For v1.2, the `tools` and `skills` arrays on each step are advisory — the agent picks from whatever the project has configured as defaults. Per-step granular selection ships in v1.3.
