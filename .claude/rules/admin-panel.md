---
paths:
  - "resources/**/server/schema.ts"
  - "resources/**/server/admin/**"
  - "resources/**/server/content.ts"
  - "resources/**/data/*.json"
---

# Admin panel (every ai-* script)

Every setting a server owner tunes lives in ai-core's one admin panel (F10 or `/aiadmin`, ACE `ai.admin`). The idea and UX come from the `tgiann-admin-panel` skill (owner experience first, live save, server validation, snapshot + delta); its tgiann-core / Lua specifics do not apply. Contract: `@aicore-fivem/shared` `admin.ts`.

## Adding a panel to a script

- Schema in `resource/server/schema.ts` (JSON safe, no functions): `files` (data model per `data/<file>.json`: `settings` = one object whose top-level keys are sections, `records` = `{ key: record }`), `tabs` (one owner task each, icon + label + one-sentence desc), cards (icon, title, desc) with widgets (`text`, `number`, `switch`, `select`, `tags`, `point`, `list`).
- `resource/server/content.ts`: `export const panel = new AdminPanel(schema)` (lib), then read with `panel.get(file)` and follow `panel.onChange(file, ...)`; never read the data file yourself. A class that parses both (`AppearanceContent` in ai-appearance) keeps the typed values.
- Data the world needs (blips, store points, prices shown to players) is `sync: "all"`: list the file in `fxFiles`, read it on the client with `new AdminWorld([files])` (the cached file, then the changes since start, then live changes). Everything else is `sync: "admin"` and never reaches non-admins.
- Every text is a lang key in the script's own `locales/en.json`; generic panel words (Save, Delete, errors) come from ai-core's.
- Values with a place in the world are `point` widgets (Use my position, Teleport), `ground: true` for floor points teleported to with `SetEntityCoords`, `from: "camera"` for camera positions. Never ask the owner to type coordinates.
- Every text field has a placeholder example; every field a hint when the label alone does not say the unit or the rule; numbers carry their unit.
- A new icon name in a schema is added to ai-core `web/src/features/admin/icons.ts`.
- Cross-field rules: `panel.rule(file, (key, next) => errorKey | null)`; keys that must never be deleted go in the file's `locked`.
- A record the script itself changes (live game state the panel shows) is stored with `panel.commit(file, key, value)`.
