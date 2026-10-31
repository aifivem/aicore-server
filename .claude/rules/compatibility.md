---
paths:
  - "resources/**/integrations/**"
  - "resources/**/bridge/**"
  - "docs/compat/**"
---

# Compatibility with other scripts

Reasoning and findings: `docs/compat/README.md`; framework surfaces: `docs/compat/frameworks.md`.

- Three layers: the framework bridge inside ai-core (ai-core presents as `es_extended`, `qb-core` and `qbx_core`, so ESX/QB/Qbox scripts run on it), integration adapters (ai-core uses other scripts: inventory, target, notify, phone, dispatch, fuel, keys, garage, clothing, banking, housing, death, voice), and one compat note per tested third-party script in `docs/compat/<script>.md`.
- No script or vendor is a priority target (owner decision): bridges follow each framework's public API, most-used functions first, so any ESX/QB/Qbox script works; the project itself ships no third-party scripts.
- Adapters live in ai-core: one interface per category in `@aicore-fivem/shared`, one adapter file per supported script, a registry line, detection once at start (and on `onResourceStart` / `onResourceStop` of a candidate), and a per-category override in the admin panel. A category only one script uses keeps its adapter in that script, written with the same template. Target scripts are the exception: their adapters live in the lib (`Points`), because a target ties options to the calling resource (`docs/compat/target.md`).
- No third-party script name appears outside its own adapter file or compat note; core code calls the category interface only.
- Adapters translate calls and nothing else; each states the tested version and warns when the installed version differs.
- Data coming back from another script is parsed at the boundary like any external input.
- A Lua export returning several values (`return hour, min`) reaches JavaScript as an array; one that waits inside (`MySQL.*.await`, `Citizen.Await`) returns a Promise: parse both shapes, never `=== true` on the raw answer.
- A third-party script that `provide`s another's name (Renewed-Weathersync provides cd_easytime, tgiann-radialmenu provides codem-supreme-radialmenu) reads started under that name too: its own adapter goes before the provided name's in the registry.
- Answer another resource's exports (`provideExport`) only for a name we `provide` in place of that resource; never for one that runs itself (ox_lib's `addRadialItem`): its own `__cfx_export_<name>_<export>` handler and ours race, the last registered wins, and its feature breaks. Such an API stays with that resource; document the limit in the category's compat note.
- `ai-*` replacement scripts answer the most-used API of their category (an `ai-inventory` answers `ox_inventory`'s exports and events) so third-party scripts work with them without an adapter; only one resource can `provide` a name.
- Bridges answer every detection style scripts use: the `provide`d name in started state, `exports['qb-core']:GetCoreObject()`, `TriggerEvent('QBCore:GetObject', cb)`, `exports.es_extended:getSharedObject()`, Qbox exports, and the framework events with the same arguments and timing.
- A script that replaces another (a paid inventory instead of ai-inventory) declares it with `ai_replaces 'ai-inventory'` in its fxmanifest (works for escrowed scripts too) or `exports["ai-core"]:RegisterReplacement({ "ai-inventory" })` (the caller is the replacement; an optional second argument names another resource); ai-core then tells the owner to delete the unneeded one and refuses joins while both run. A new ai-* stand-in (`fxProvide`) is added to `STAND_INS` in ai-core `connection/conflicts.ts`.
- A compat note states: tested version, status (works / needs a config value / needs a patch to the script's open bridge file), the exact config or patch, known limits.
