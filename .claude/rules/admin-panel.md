---
paths:
  - "resources/**/server/schema.ts"
  - "resources/**/server/admin/**"
  - "resources/**/server/content.ts"
  - "resources/**/data/*.json"
---

# Admin panel (every ai-* script)

Every setting a server owner tunes lives in ai-core's one admin panel (F10 or `/aiadmin`, ACE `ai.admin`). The owner's experience comes first: someone who never opened a code file sets every value without docs (plain labels and hints, units, pickers and world tools instead of typed values), every edit saves live after server validation, and changes reach players as deltas. Contract: `@aicore-fivem/shared` `admin.ts`.

## Adding a panel to a script

- Schema in `resource/server/schema.ts` (JSON safe, no functions): `files` (data model per `data/<file>.json`: `settings` = one object whose top-level keys are sections, `records` = `{ key: record }`), `tabs` (one owner task each, icon + label + one-sentence desc), cards (icon, title, desc) with widgets (`text`, `number`, `switch`, `select`, `tags`, `point`, `list`, read-only `info`).
- `resource/server/content.ts`: `export const panel = new AdminPanel(schema)` (lib), then read with `panel.get(file)` and follow `panel.onChange(file, ...)`; never read the data file yourself. A class that parses both (`AppearanceContent` in ai-appearance) keeps the typed values.
- Data the world needs (blips, store points, prices shown to players) is `sync: "all"`: list the file in `fxFiles`, read it on the client with `new AdminWorld([files])` (the cached file, then the changes since start, then live changes). Everything else is `sync: "admin"` and never reaches non-admins.
- Every text is a lang key in the script's own `locales/en.json`; generic panel words (Save, Delete, errors) come from ai-core's.
- Values with a place in the world are `point` widgets (Use my position, Teleport), `ground: true` for floor points teleported to with `SetEntityCoords`, `from: "camera"` for camera positions. Never ask the owner to type coordinates.
- Every text field has a placeholder example; every field a hint when the label alone does not say the unit or the rule; numbers carry their unit.
- A new icon name in a schema is added to ai-core `web/src/features/admin/icons.ts`.
- A records tab's `deleteLabel` is a short verb label ("Delete shop"): it is the delete button and the dialog's action. What a delete leaves behind goes into `deleteDesc` (shown in the dialog instead of the generic text).
- `list` rows take `text`, `number`, `switch` and `point` widgets (route checkpoints, spawn lists). A row with more fields than fit on one line is split over several cards, each a `list` widget on the same path with its own `rows` and the full `newRow` (ai-core `admin/sceneSchema.ts`).
- Cross-field rules: `panel.rule(file, (key, next) => errorKey | null)`; keys that must never be deleted go in the file's `locked`.
- A record the script itself changes (live game state the panel shows) is stored with `panel.commit(file, key, value)`.
- Runtime state the panel only shows (a live list, never saved) is a `memory: true` file filled with `commit`; the panel cannot edit it.
- A read-only list of records is a tab with `table: { columns, sort }` and `cards: []` (one searchable, virtualized table); a column's `values` maps stored values to lang keys, `empty` names the text for an empty value (same on `info`).
