# project-library/characters/

Developer-authored characters for this Cactai project. One folder per character.

A character is an **SVG** plus an **animation** — where an animation is a set of
location-change instructions for the SVG, one per agent state. This mirrors the
platform's built-in characters (Owl / Robot / Prairie Dog) and the
`PersonalityCharacter` shape; nothing here is bespoke.

## Folder convention

`project-library/characters/<id>/` containing:

- `<id>.svg` — the artwork. Give the moving parts named element classes (e.g.
  `.<id>-head`, `.<id>-wing-l`) so the animations can target them.
- `character.json` — the `PersonalityCharacter` metadata:

  ```json
  {
    "svg_id":               "<id>",
    "idle_animation":       "anim-<id>-idle",
    "thinking_animation":   "anim-<id>-think",
    "waiting_animation":    "anim-<id>-wait",
    "responding_animation": "anim-<id>-respond"
  }
  ```

- `animations.css` — the CSS `@keyframes` + the four animation classes named
  above. Each keyframe is a location/transform change on the SVG's named parts
  (translate / rotate / scale) — the "location-change instructions."

## States

The four animations map to agent moods, exactly like the built-ins:

- `idle` — resting / waiting.
- `thinking` — processing a turn.
- `waiting` — developer is slow to respond after the agent asked something.
- `responding` — streaming a response.

## How characters get here

1. DevShell chat — `Load character from …` and the agent writes the files.
2. Conversational / form authoring — describe it (or fill the Studio character
   form) and the result lands here. The SVG itself is usually produced by AI or
   an external drawing tool and dropped in.
3. Direct file write — drop the folder in by hand.

## Loading

`src/lib/projectLibrary.server.ts` scans this directory at startup, validates
that each folder has a `character.json` matching `PersonalityCharacter` and that
its referenced `.svg` exists, and records each in the project-library manifest
(with a status the DevShell Library surfaces). Malformed characters are skipped
with a logged error — they never crash startup.
