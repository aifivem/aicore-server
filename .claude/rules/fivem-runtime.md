---
paths:
  - "resources/**/resource/**/*.ts"
  - "resources/**/locales/*.json"
---

# FiveM client/server (TypeScript)

Engine and native knowledge: the `aicore-fivem` skill (`references/engine.md`, `references/sync.md`). Research behind these rules: `references/runtime.md` and `references/docs.md` in the same skill.

## Security model (enforced by security.cfg)

- `sv_entityLockdown relaxed` (owner decision: the game's ambient peds and traffic need it; the one exception to never loosening `security.cfg`): script entities are created on the server only, a client script's networked entity is blocked. Ambient NPCs and traffic are client-created and may be on any client: treat them as untrusted (an NPC a client says it sold to is checked on the server). Vehicles: server `CreateVehicleServerSetter`, peds/objects: server `CreatePed` / `CreateObjectNoOffset`; persistent ones get `SetEntityOrphanMode(entity, 2)`. Clients create only `isNetwork = false` local entities (cosmetic, previews, single-player props).
- `sv_stateBagStrictMode true`: only the server writes state bags, through the lib's server state classes (`set`). A client never sets a state bag (not even a local one): it asks through a validated callback; the server sets; clients read the lib mirror.
- `sv_filterRequestControl 4`: no `NetworkRequestControlOfEntity`. Work on another entity uses a server native or an event to the owner found with `NetworkGetEntityOwner`.
- The server is authoritative: every client argument is checked for type, range, ownership and distance (server-side `GetEntityCoords(GetPlayerPed(src))`). Money, item, reward and permission decisions never happen on the client.
- The server listens to clients only through the lib's gate (owner decision, never a bare `onNet`): `onClientEvent` for net events, `onClientCallback` for requests. Each runs, in order: real player check (a local emit is dropped), per-player rate (events 10/s, callbacks 20/s by default), `guards` (`isAdmin()`, `hasCharacter()`, `near(point, metres)`, or any `(source) => true | false | reason`), the `args` parser, optional `lock` (one call at a time per player). Refusals with a reason and rate-limit refusals are logged with the player, one line per player and input per 10 s (the rest counted into the next line), arguments cut to 200 characters before they are serialized.
- A handler that takes arguments gets them only through `args`, and the options come first: `onClientEvent(name, { args: ([a, b]) => ok ? [a, b] : null, guards }, (source, a, b) => ...)`; without arguments `onClientEvent(name, (source) => ..., { guards? })`. Unchecked client data never reaches a handler.
- The client listens to the server only through `onServerEvent(name, handler)` / `onServerEvent(name, { args }, handler)`, which drops local emits. Same-side events use `on`.

## Events, exports, state bags

- Event payloads stay small; multi-KB data goes through `TriggerLatentClientEvent` / `TriggerLatentServerEvent` (`bps` is bytes per second per target, default 25000). On the client a latent server event has `source` 0 (a normal one 65535): never test the source for truthiness (`aicore-fivem` `runtime.md`).
- Data deeper than 16 levels is silently cut by msgpack: send deep data as a JSON string and parse it at the last stop.
- Exports and cross-resource events copy their data. No export returns a whole object; hot paths never call another resource's export; a consumer mirrors what it needs and updates it from delta events.
- Exports stay synchronous; no promise crosses a resource boundary.
- While a client loads, resources are created one after another and a later one already reads `started` (also through a `provide`d name) before its scripts ran: calling its export throws "No such export". A client-side call into another resource at start treats that error as "not ready yet" and acts again on that resource's `onClientResourceStart` (ai-core `AdapterPicker` and lib `Points` target calls do); never let it throw out of a script's top level (the whole file fails to load). One `on(event)` per resource and event, not one per object: more than 10 listeners on one event print Node's MaxListenersExceededWarning.
- Static data ships as files and is read locally, never sent through events or exports.
- State bags only through lib `EntityState` / `PlayerState` / `GlobalKey` / `GlobalGroup` (`lib.md` "State bags"): never `Entity(e).state`, `Player(p).state`, `GlobalState`, `LocalPlayer.state` or `AddStateBagChangeHandler` in a script. A raw read builds proxies, calls natives, copies under engine locks and decodes msgpack every time (it stalls server ticks under load); a raw change handler runs before the value is stored; a set is deferred when any handler exists. Reasons and numbers: `aicore-fivem` `references/statebags.md`.
- Per-entity data goes into the entity's state bag; shared runtime state into one `GlobalGroup` key per item; never broadcast whole configs. Values are flat (one key per value, `state.x.y = v` does not replicate).
- A client waits for a server-created entity with lib `waitForEntity(netId, timeoutMs)` (`NetworkDoesEntityExistWithNetworkId` + `NetToEnt`, 0 on timeout). entity↔netId conversion goes through one helper. Never send entity handles or player indices between machines.
- `GetEntityArchetypeName` does not exist on the server: validate a model with `GetHashKey(model) === GetEntityModel(entity)`.

## @aicore-fivem/lib (instead of ox_lib)

ai-* resources never import ox_lib (owner decision); the lib covers what ox_lib was used for. Missing something ox_lib had? Add it to the lib, never pull ox_lib in.

- Callbacks: server `onClientCallback` (same forms and gate as `onClientEvent`; a refused call rejects the client's promise at once), client `triggerServerCallback(name, [args], timeoutMs?)`; the reverse direction `onServerCallback` / `triggerClientCallback(name, src, [args])`. Answers are `unknown`: parse them. No hand-made request/response event pairs.
- Lang: `createLocale<typeof en>()` from `@aicore-fivem/lib/fivem` (the template's `resource/common/locale.ts`).
- Keybinds: client `new Keybind({ name, description, defaultKey, onPressed, onReleased })`; the name is a stable id without the key (the lib appends the panel's or the default key); mouse buttons need `defaultMapper: "MOUSE_BUTTON"`. Commands: server `addCommand` (`lib.md` "Commands and keybinds").
- Player values: `cache.ped`, `cache.playerId`, `cache.serverId`, `cache.vehicle`, `cache.seat`, `cache.weapon` (`false` = none) instead of calling natives in loops; `onCache(key, (value, old) => ...)` reacts to a change. One watcher in ai-core feeds every resource (entering a vehicle from the game event at once; ped, weapon and in-vehicle seat / exit read every 100 ms); nobody polls these. `onCache("vehicle")` instead of reading `GetVehiclePedIsIn` / `IsPedInAnyVehicle` on a timer.
- Areas: lib `Zones` (`sphere`, `cylinder`, `poly`; each zone its own `interval` ms, default 500; `onEnter` / `onExit`). Never a hand-written distance loop; per-frame work only while inside, and only when it must draw.
- Interaction points: lib `Points` (prompt or target as the owner picks, `lib.md` "Interaction points"); `showPrompt` / `hidePrompt` only for a prompt that is not at a place. Never GTA help text (`BeginTextCommandDisplayHelp`) or per-frame `IsControlJustReleased`.
- Game events instead of polling: client `gameEventTriggered (name, args)` (`CEventNetworkPlayerEnteredVehicle`: [player, vehicle]; `CEventNetworkEntityDamage` for hits and deaths of any entity), client `entityDamaged (victim, culprit, weapon, baseDamage)`, server `entityCreated` / `entityCreating` (cancelable) / `entityRemoved`, `weaponDamageEvent`, `onPedDeath` (ai-core's `CORE.playerDiedEvent`). There is no exit-vehicle, seat or weapon-switch event: those come from lib `cache` / `onCache`. Details: `aicore-fivem` `references/events.md`.
- OneSync scope events (`playerEnteredScope` / `playerLeftScope`) cost per player in scope: one set of handlers in ai-core only; resources use lib `playersNear` / `playersNearEntity`.
- Interiors and private areas hide players with the conceal natives (`NetworkConcealPlayer`), routing buckets only for fully separate worlds (character screen, instanced houses), always from lib `buckets` (ai-core's allocator).
- Waiting and loading: `sleep`, `waitFor` (resolves on the first non-`undefined` value, write `cond || undefined`; default timeout 10 s, `false` for none), `requestModel`, `requestAnimDict`, `requestPtfxAsset`.

## JS runtime

- On the server, return to the game thread with `setImmediate` before calling a native inside a Node callback (fs, http, Node timers), or it fails with "No current resource manager".
- Periodic work on either side runs on the resource's one scheduler: lib `every(ms, fn)` (0 = every frame), never `setInterval` / `setTick` (`lib.md` "Periodic work"). Server jobs run on the game thread, so natives work in them.
- Client code has no DOM/Node APIs (fs, Buffer, localStorage, fetch); packages using them never enter the client bundle.
- Never write bare `exports` in source and never `export` a value from an entry file (the script shows "Started" but does not load). Use `registerExport(name, fn)` and a top-level `const core = resourceExport("ai-core")` from `@aicore-fivem/lib` (`lib.md` "Exports of other resources").

## Events and naming

- Event/callback names are `<resource>:<camelCase>` from the constants file, with the resource name written out (not built from `GetCurrentResourceName()`).
- Resource name comparisons use the template's `ResourceName` (`resource/common/resource.ts`): `if (resource !== ResourceName) return`.

## Lang

- `locales/en.json` is complete and the base; other languages override it; a missing key shows as the key name. Typed access through `resource/common/locale.ts`: `Locale("NOTIFY_NO_MONEY", ...args)`. Language from the replicated `ai:locale` convar (`misc.cfg`). A text may reference another with `${OTHER_KEY}`.
- Keys are flat, FULL UPPERCASE, topic-prefixed (`NOTIFY_NO_MONEY`, `KEYBIND_OPEN_MENU`). Values use positional placeholders `{0}`, `{1}` (never `%s`/`%d`). No em dash in texts.
- No player-facing text is a literal in code, notifications and keybind descriptions included.
- The DB stores lang keys plus arguments, never display text.

## Logs

- Every log goes through ai-core: `aiLog(channel, message, { level, source, target, metadata })` from `@aicore-fivem/lib/server` (channels described once with `aiLogChannels`). Never post to a Discord webhook or a log service from a resource: providers, minimum level, routing, webhook urls and API keys are all ai-core panel settings (secrets in its git-ignored `data/secrets.json`).
- Pass `source` / `target` instead of writing names into the message; ai-core adds the player's name, character and identifiers. Values go into `metadata`.

## Permissions

- ACE: `group.admin` is a principal, `IsPlayerAceAllowed(src, "group.admin")` is always false. In JS `IsPlayerAceAllowed` returns `1`/`0`: wrap in `Boolean(...)`. Restricted commands use `addCommand` with `restricted: true` (ai-core admins) or `restricted: "group.admin"`. ACE lines live in `permission.cfg`.
- Players do not type commands; every feature has a UI. Only developer test commands exist, restricted.

## Natives

- Before using a native new to the codebase, verify it with `python .claude/skills/aicore-fivem/tools/native.py <name>` (name, argument order, client/server apiset).
- Clothing is addressed by collection name + local index (`SetPedCollectionComponentVariation`), never by global drawable index.
- DUI is created once and lives forever; `DestroyDui` only in `onResourceStop`.
