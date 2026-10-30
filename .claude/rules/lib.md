---
paths:
  - "resources/**/*.{ts,tsx}"
---

# Shared packages

`packages/` in the server folder (outside `resources/`, so FXServer never sees it) is its own git repo and is published to npm under `@aicore-fivem`. Resources depend on them with npm ranges; bun links the local copies inside the workspace.

| Package | Content | When |
|---|---|---|
| `@aicore-fivem/lib` | Repeated helpers: `/shared` (anywhere, no natives), `/fivem` (natives on both sides, for `resource/common/`), `/server`, `/client` | A helper is about to be written a second time |
| `@aicore-fivem/shared` | Contracts between resources: types, event/callback names, export types (`CitizenExports`) | Anything one resource uses to talk to another |
| `@aicore-fivem/mysql` | The database engine (`mysql` API, in-process pool) and the oxmysql-compatible functions `ai-mysql` exports | Every DB access of an ai-* resource |
| `@aicore-fivem/build` | Build steps (`aicore-client-errors`) | Every resource's `build` script |

- The lib replaces ox_lib in ai-* resources (owner decision): never import ox_lib; what is missing gets added to the lib.
- Every helper is built for scale: benchmark anything that holds or walks a collection at 100k and 1M (`packages/lib/bench/`, `bun run bench`).
- Look in `@aicore-fivem/lib` before writing a helper; add it there when a second user appears. Code specific to one resource stays in that resource.
- Every lib function has a one-line JSDoc saying what it does. `/server`, `/client` and `/fivem` may call natives; `/shared` never does.
- Another resource's export types extend `CitizenExports` in `@aicore-fivem/shared/src/exports.ts` (a type alias per resource, not an interface).
- A change to a package that resources rely on is a version bump of that package (the owner bumps versions) and a note in the package repo's changelog.
- Current lib: `isRecord`, `logSafe` (client text made safe for the console), `formatText` (`{0}` placeholders), `createLogger`, `sleep`, `waitFor`, `asArgs` (one parsed value as an `args` list), panel content readers `num` / `int` / `bool` / `str` / `record` / `vec4`, `vehicleTypeOfClass` (vehicle class to the `CreateVehicleServerSetter` type) (shared); `createLocale`, `loadLocaleTexts` (lang table for a NUI), `registerExport`, `resourceExport`, `optionalExport`, `callExport` (untyped export of a third-party script, for adapters), `isResourceStarted` (fivem, also re-exported from client and server); `eventSource`, `isOnline`, `SourceLock`, `RateLimit`, `WriteQueue`, `DataFile` (panel content in `data/*.json`, atomic writes), `AdminPanel` (a script's panel store: schema, validation, save, deltas; `.claude/rules/admin-panel.md`), `aiLog` / `aiLogChannels` (logs through ai-core), `notify(source, text, kind)` (ai-core notification card), `inventory` (items through ai-core, below), `vehicleKeys` (`give` / `remove` / `has` through ai-core's key layer, `docs/compat/vehicle-keys.md`), `online` (mirror of loaded players: `sources()`, `character`, `jobs`, `gangs`, `dutyJob`, `onDutyFor(job)`), `playersNear(source, radius)` / `playersNearEntity(entity, radius)` (candidates from OneSync scope, up to ~424 m), `addCommand` (server commands, below), `createDatabaseTables`, `onClientEvent`, `onClientCallback` (client input through the gate: rate, `guards`, `args`, `lock`), guards `isAdmin`, `hasCharacter`, `near`, `triggerClientCallback`, `sendPlayerData` / `patchPlayerData` (ai-core only) (server); `TickLoop`, `Keybind` (below), `requestModel`, `requestAnimDict`, `requestPtfxAsset`, `onServerEvent`, `Zones` (per-zone interval, 64 m grid), `cache` / `onCache` (fed by ai-core's watcher), `showPrompt` / `hidePrompt` / `onPromptPressed`, `notify(text, kind)`, `inventory` (`openInventory`, `hasItem`), `progress({ label, duration, anim })` (ai-core's progress bar, resolves false when cancelled), `menu(request, onHover?)` / `input(request)` (ai-core's shared menu and input dialog; `onHover` previews the item under the pointer), `triggerServerCallback`, `onServerCallback`, `onPlayerData`, `getPlayerData`, `seedPlayerData`, `AdminWorld` (client mirror of a script's `sync: "all"` panel files) (client).

## Items

- Every item call goes through lib `inventory` (server `addItem`, `removeItem`, `getItemCount`, `hasItem`, `canCarryItem`, `getItems`, `clearInventory`, `registerStash`, `openInventory`, `registerUsableItem`, `getItemDefinition`; client `openInventory`, `hasItem`), never an inventory's own exports: ai-core forwards to the active inventory (`docs/compat/inventory.md`).
- Register usable items and stashes once at the script's start; ai-core keeps them for inventories that start later or restart, so no `onServerResourceStart` re-registration.
- Vehicle keys go through lib `vehicleKeys` (server), never a key script's own exports (ai-vehiclekeys included); ai-core forwards to the active key system (`docs/compat/vehicle-keys.md`).
- Item effects (hunger, thirst, stress) arrive on ai-core's `CORE.itemUsedEvent`, not an inventory's own event.
- A player's death: listen to ai-core's server event `CORE.playerDiedEvent (src, killer, weaponHash)` (FXServer 38039+ `onPedDeath`); never poll health. Only when `GlobalState[PED_DEATH_STATE_KEY]` is false (older artifact) does a client watch `IsEntityDead`.

## Commands and keybinds

- Every server command is `addCommand(name | [name, ...aliases], { help, params, restricted }, (source, args, raw) => ...)` from `@aicore-fivem/lib/server`, never a bare `RegisterCommand`. `help` and param `help` are lang texts.
- `params`: `{ name, type: "number" | "playerId" | "string" | "longString", help?, optional? }` in order (`longString` last, takes the rest of the line). They are parsed before the handler runs; wrong input shows the error and the usage line as an ai-core notification (ai-core's `COMMAND_*` texts). `args` is typed from them (`args.id` is `number`, `number | undefined` when optional). `source` 0 = server console. A param object shared by several commands is declared `as const`, or its name and type widen and `args` loses them.
- `restricted`: `false` (default, everyone), `true` (ai-core admins, ACE `ai.admin`), or an ace / principal or a list (`"group.admin"`, `["ai.admin", "ai.job.police"]`). Checked on the server with ACE; `command.<name>` always allows too (server.cfg, txAdmin); ai-core grants `command.<name>` to listed principals (needs `add_ace resource.ai-core command.add_ace allow` and `command.remove_ace` in `permission.cfg`). Never check permissions by hand inside a handler.
- Chat suggestions (with help and params) go only to players allowed to use the command, refreshed on character load and job or gang changes; ai-core's panel lists every command (Commands tab).
- `new Keybind({ name, description, defaultKey, defaultMapper, onPressed, onReleased })` (client): `name` is a stable id without the key (`inventory_open`); the lib registers the mapping `+<name>_<key>` with the key ai-core's panel sets (Keybinds tab), else `defaultKey`. Registration waits for ai-core's answer (one round trip at start). A panel change applies when the script starts again or the player reconnects. Another resource that needs a keybind's bound key asks ai-core's client export `GetKeybindKey(name)` (the mapping command is `+<name>_<key>`).
- lib `menu` item icons are looked up in ai-core's icon map (`web/src/features/admin/icons.ts`, shared with the panel); a name missing there shows a dot, so add it there first.
