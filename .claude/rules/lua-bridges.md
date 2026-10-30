---
paths:
  - "resources/**/*.lua"
  - "resources/**/bridge/**"
---

# Lua (ai-core's bridge, ai-lib's Lua side)

The Lua in the project is ai-core's framework bridge (`resources/[ai]/ai-core/bridge/{core,qb,qbx,esx}/{server,client}.lua`, plus `modules/playerdata.lua` for Qbox includes), loaded after ai-core's JS in the same resource through `fxServerScripts` / `fxClientScripts` in `package.json`, and ai-lib's Lua side (`resources/[ai]/ai-lib/init.lua` + `lua/{shared,client,server}/<name>.lua`, one module per `aiLib.<name>`, loaded on first use in the calling resource). Everything else is TypeScript. Coverage: `docs/compat/bridge.md`.
- ai-lib's Lua side mirrors the TypeScript lib: same names where Lua allows (`aiLib.notify`, `aiLib.Points.new()`, `aiLib.addCommand`), the same wire formats (callbacks `aicore:cb:<name>` / `aicore:cbr:<resource>`, keybind and prompt events, state bag keys), so Lua and TypeScript resources work together. A lib change that a Lua user can see is made on both sides; every module carries LuaLS annotations and its field in `init.lua`'s `AiLib` class; check with the Lua language server (0 diagnostics).
- A server native whose player parameter is `char*` (`IsPlayerAceAllowed`) gets `tostring(source)`: a Lua number 0 (the console) goes to native code as a null pointer ("Argument at index 0 was null").
- Lua 5.4 (CfxLua); no `lua54` line in the manifest (Lua 5.3 was removed in June 2025).
- Every function, table and field a ready-made script can touch has LuaLS annotations (`---@class`, `---@field`, `---@param`, `---@return`) matching the original framework's documented types.
- ai-core `provide`s `es_extended`, `qb-core` and `qbx_core` (manifest, always on: a provided name reports `started` whether or not the bridge answers). `provide` does not alias exports: the bridge answers `exports['qb-core']:X()` through `__cfx_export_qb-core_X` handlers, the same way ai-mysql answers oxmysql.
- The bridge holds no game logic: every call forwards to ai-core (same resource, JS side) and the `xPlayer` / `PlayerData` mirrors update from ai-core's local delta events, never by calling ai-core per read.
- A table handed to another resource (core object, Player, xPlayer) is copied by msgpack: metatables and `__index` proxies are lost, functions become references back into ai-core. Hand out plain tables filled at that moment (`QBCore.Shared.*` is rebuilt on every `GetCoreObject`).
- `provide` lines added while the server runs report `missing` in `GetResourceState` (even after `refresh` and a resource restart) until the next full server start; exports and events answer at once.
- Check the bridge with the Lua language server (VS Code "Lua" or "Qbox Lua" extension, LuaLS) and fix every diagnostic.
- No ox_lib dependency in the bridges: plain CfxLua and natives (`SetTimeout`, `Citizen.Await`, promises); the scripts the bridges serve may load ox_lib themselves.
- Same security and sync rules as the TS code: validate client input, snapshot + delta, no polling.
