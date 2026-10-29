---
paths:
  - "resources/**/integrations/**"
  - "resources/**/bridge/**"
  - "docs/compat/**"
---

# Compatibility with other scripts

Reasoning and findings: `docs/research/compatibility.md`.

- Three layers: the framework bridge inside ai-core (ai-core presents as `es_extended`, `qb-core` and `qbx_core`, so ESX/QB/Qbox scripts run on it), integration adapters (ai-core uses other scripts: inventory, target, notify, phone, dispatch, fuel, keys, garage, clothing, banking, housing, death, voice), and one compat note per tested third-party script in `docs/compat/<script>.md`.
- No script or vendor is a priority target (owner decision): bridges follow each framework's public API, most-used functions first, so any ESX/QB/Qbox script works; the project itself ships no third-party scripts.
- Adapters live in ai-core: one interface per category in `@aicore-fivem/shared`, one adapter file per supported script, a registry line, detection once at start (and on `onResourceStart` / `onResourceStop` of a candidate), and a per-category override in the admin panel. A category only one script uses keeps its adapter in that script, written with the same template.
- No third-party script name appears outside its own adapter file or compat note; core code calls the category interface only.
- Adapters translate calls and nothing else; each states the tested version and warns when the installed version differs.
- Data coming back from another script is parsed at the boundary like any external input.
- `ai-*` replacement scripts answer the most-used API of their category (an `ai-inventory` answers `ox_inventory`'s exports and events) so third-party scripts work with them without an adapter; only one resource can `provide` a name.
- Bridges answer every detection style scripts use: the `provide`d name in started state, `exports['qb-core']:GetCoreObject()`, `TriggerEvent('QBCore:GetObject', cb)`, `exports.es_extended:getSharedObject()`, Qbox exports, and the framework events with the same arguments and timing.
- A compat note states: tested version, status (works / needs a config value / needs a patch to the script's open bridge file), the exact config or patch, known limits.
