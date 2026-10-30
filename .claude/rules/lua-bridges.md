---
paths:
  - "resources/**/*.lua"
  - "resources/**/bridge/**"
---

# Lua (ai-core's bridge only)

The only Lua in the project is ai-core's framework bridge (`resources/[ai]/ai-core/bridge/{core,qb,qbx,esx}/{server,client}.lua`, plus `modules/playerdata.lua` for Qbox includes), loaded after ai-core's JS in the same resource through `fxServerScripts` / `fxClientScripts` in `package.json`. Everything else is TypeScript. Coverage: `docs/compat/bridge.md`.

- Lua 5.4 (CfxLua); no `lua54` line in the manifest (Lua 5.3 was removed in June 2025).
- Every function, table and field a ready-made script can touch has LuaLS annotations (`---@class`, `---@field`, `---@param`, `---@return`) matching the original framework's documented types.
- ai-core `provide`s `es_extended`, `qb-core` and `qbx_core` (manifest, always on: a provided name reports `started` whether or not the bridge answers). `provide` does not alias exports: the bridge answers `exports['qb-core']:X()` through `__cfx_export_qb-core_X` handlers, the same way ai-mysql answers oxmysql.
- The bridge holds no game logic: every call forwards to ai-core (same resource, JS side) and the `xPlayer` / `PlayerData` mirrors update from ai-core's local delta events, never by calling ai-core per read.
- A table handed to another resource (core object, Player, xPlayer) is copied by msgpack: metatables and `__index` proxies are lost, functions become references back into ai-core. Hand out plain tables filled at that moment (`QBCore.Shared.*` is rebuilt on every `GetCoreObject`).
- Seen on the dev server: `provide` lines added while the server runs report `missing` in `GetResourceState` even after `refresh` and a restart of the resource, while exports and events answer at once; check the state again after a full server restart.
- Verify a resource with the `tgiann-fivem-dev` skill's `tools/qbx-check.mjs` and fix what it reports. The tgiann-core / store-script specific Lua rules of that skill do not apply.
- No ox_lib dependency in the bridges: plain CfxLua and natives (`SetTimeout`, `Citizen.Await`, promises); the scripts the bridges serve may load ox_lib themselves.
- Same security and sync rules as the TS code: validate client input, snapshot + delta, no polling.
