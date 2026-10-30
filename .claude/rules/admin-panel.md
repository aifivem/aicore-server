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
- Values that name something existing in the game carry a `lookup` on both the data spec and the widget: `lookup: "item" | "job" | "gang" | "account"` on `text` (one value) or `names` + `tags` (several). The panel offers only listed values (autocomplete with labels) and every script's lib refuses anything else (`ADMIN_ERR_LOOKUP`); an empty list (no inventory running) refuses nothing. Never a free text field for an item, job, gang or account.
- A record's name next to a place gets `suggest: { from: "<point path>" }` on its `text` widget: buttons with the street and zone names there (the admin's position without `from`).
- A map blip is one `{ sprite, color, scale }` object with the `blip` widget (picture grid from the FiveM blip reference, colour swatches, size); never a typed sprite id.
- Values with a place in the world are `point` widgets (Use my position, Teleport), `ground: true` for floor points teleported to with `SetEntityCoords`, `from: "camera"` for camera positions; every point widget also offers the free camera pick (fly, aim at the floor, scroll for heading, Enter). Never ask the owner to type coordinates.
- Every text field has a placeholder example; every field a hint when the label alone does not say the unit or the rule; numbers carry their unit.
- A new icon name in a schema is added to ai-core `web/src/features/admin/icons.ts`.
- A records tab's `deleteLabel` is a short verb label ("Delete shop"): it is the delete button and the dialog's action. What a delete leaves behind goes into `deleteDesc` (shown in the dialog instead of the generic text).
- `list` rows take `text`, `number`, `switch` and `point` widgets (route checkpoints, spawn lists). A row with more fields than fit on one line is split over several cards, each a `list` widget on the same path with its own `rows` and the full `newRow` (ai-core `admin/sceneSchema.ts`).
- Every panel file gets a JSON Schema without extra work: the lib writes `data/schemas/<file>.schema.json` at start from the data specs (types, limits, enums, patterns) and the labels and hints in `locales/en.json`, and keeps `"$schema": "./schemas/<file>.schema.json"` as the data file's first key, so an editor validates and explains a hand edit. Code never sees that key (`DataFile`, `AdminWorld`); anything else that reads a data file uses `withoutSchemaKey`. A label or hint is the schema's description: write them for someone editing the file too.
- Cross-field rules: `panel.rule(file, (key, next) => errorKey | null)`; keys that must never be deleted go in the file's `locked`.
- A record the script itself changes (live game state the panel shows) is stored with `panel.commit(file, key, value)`.
- Runtime state the panel only shows (a live list, never saved) is a `memory: true` file filled with `commit`; the panel cannot edit it.
- A read-only list of records is a tab with `table: { columns, sort }` and `cards: []` (one searchable, virtualized table); a column's `values` maps stored values to lang keys, `empty` names the text for an empty value (same on `info`).
