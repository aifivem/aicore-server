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

- Schema in `resource/server/schema.ts` (JSON safe, no functions): `files` (data model per `data/<file>.json`: `settings` = one object whose top-level keys are sections, `records` = `{ key: record }`), `tabs` (one owner task each, icon + label + one-sentence desc), cards (icon, title, desc) with widgets (`text`, `number`, `switch`, `select`, `tags`, `point`, `list`, read-only `info`). A `number` field with `unit: "g"` also shows its value in kg next to it. Any widget may carry `showIf: { path, values }`: it shows only while the value at `path` (read like the field's own path) is one of `values`; give that value a default in `newRecord`. A `select` option may have the value `""` ("none" / "use the script's default"); the widget maps it internally, so a schema writes it plainly.
- `resource/server/content.ts`: `export const panel = new AdminPanel(schema)` (lib), then read with `panel.get(file)` and follow `panel.onChange(file, ...)`; never read the data file yourself. A class that parses both (`AppearanceContent` in ai-appearance) keeps the typed values.
- Data the world needs (blips, store points, prices shown to players) is `sync: "all"`: list the file in `fxFiles`, read it on the client with `new AdminWorld([files])` (the cached file, then the changes since start, then live changes). Everything else is `sync: "admin"` and never reaches non-admins.
- Every text is a lang key in the script's own `locales/en.json`; generic panel words (Save, Delete, errors) come from ai-core's.
- Values that name something existing in the game carry a `lookup` on both the data spec and the widget: `lookup: "item" | "job" | "gang" | "account" | "resource" | "player"` on `text` (one value) or `names` + `tags` (several). The panel offers only listed values (autocomplete with labels) and every script's lib refuses anything else (`ADMIN_ERR_LOOKUP`); an empty list (no inventory running) refuses nothing. Never a free text field for an item, job, gang or account.
- A value that names a record of another records file of the same script (an item's rarity, a recipe's bench) is a `text` with `records: "<file>"` on both the data spec and the widget: the panel lists that file's records by label (plus None) and the lib refuses a key that is not there.
- A record's name next to a place gets `suggest: { from: "<point path>" }` on its `text` widget: buttons with the street and zone names there (the admin's position without `from`).
- A place players use (shop, counter, depot, garage) offers an NPC: section `ped: PLACE_PED_SPEC`, a card `{ icon: "user", title: "ADMIN_C_PED", desc: "ADMIN_C_PED_DESC", fields: placePedFields() }` and `ped: readPlacePed(v.ped)` in the reader (lib `/shared`); the client passes it to the place's `Points` entry (`ped: place.ped ?? undefined`). Texts are ai-core's generic ones.
- A game model is a `model` widget (`kind: "vehicle" | "ped" | "object"`: search over the admin game's vehicles, GTA's peds, pictures from the FiveM docs, a typed addon name is kept); a colour is a `color` widget (`#rrggbb`, presets); a world object (door, prop) is an `entity` widget on its vec3 with `modelPath` (picked with the free camera, outlined, the model name written too); an online character is a `text` widget with `lookup: "player"` (citizen id); a script name `lookup: "resource"`.
- Records tabs copy every record as JSON and import pasted records (all or none, each checked like an edit, existing keys replaced or skipped): nothing to add per script.
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
