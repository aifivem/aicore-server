---
paths:
  - "resources/**/resource/**/*.ts"
  - "resources/**/locales/*.json"
---

# FiveM client/server (TypeScript)

Engine and native knowledge: `tgiann-fivem-dev` skill `notes-fivem.md` (translate Lua examples to TS). Research behind these rules: `docs/research/fivem-runtime.md`, `docs/research/fivem-docs.md`.

## Security model (enforced by security.cfg)

- `sv_entityLockdown strict`: networked entities are created on the server only. Vehicles: server `CreateVehicleServerSetter`, peds/objects: server `CreatePed` / `CreateObjectNoOffset`; persistent ones get `SetEntityOrphanMode(entity, 2)`. Clients create only `isNetwork = false` local entities (cosmetic, previews, single-player props).
- `sv_stateBagStrictMode true`: only the server writes replicated state bags. A client asks through a validated callback; the server writes; clients read with `AddStateBagChangeHandler`.
- `sv_filterRequestControl 4`: no `NetworkRequestControlOfEntity`. Work on another entity uses a server native or an event to the owner found with `NetworkGetEntityOwner`.
- The server is authoritative: every client argument is checked for type, range, ownership and distance (server-side `GetEntityCoords(GetPlayerPed(src))`). Money, item, reward and permission decisions never happen on the client.
- The server listens to clients only through the lib's gate (owner decision, never a bare `onNet`): `onClientEvent` for net events, `onClientCallback` for requests. Each runs, in order: real player check (a local emit is dropped), per-player rate (events 10/s, callbacks 20/s by default), `guards` (`isAdmin()`, `hasCharacter()`, `near(point, metres)`, or any `(source) => true | false | reason`), the `args` parser, optional `lock` (one call at a time per player). Refusals with a reason are logged with the player.
- A handler that takes arguments gets them only through `args`, and the options come first: `onClientEvent(name, { args: ([a, b]) => ok ? [a, b] : null, guards }, (source, a, b) => ...)`; without arguments `onClientEvent(name, (source) => ..., { guards? })`. Unchecked client data never reaches a handler.
- The client listens to the server only through `onServerEvent(name, handler)` / `onServerEvent(name, { args }, handler)`, which drops local emits. Same-side events use `on`.

## Events, exports, state bags

- Event payloads stay small; multi-KB data goes through `TriggerLatentClientEvent` / `TriggerLatentServerEvent` (`bps` is bytes per second per target, default 25000).
- Data deeper than 16 levels is silently cut by msgpack: send deep data as a JSON string and parse it at the last stop.
- Exports and cross-resource events copy their data. No export returns a whole object; hot paths never call another resource's export; a consumer mirrors what it needs and updates it from delta events.
- Exports stay synchronous; no promise crosses a resource boundary.
- Static data ships as files and is read locally, never sent through events or exports.
- State bag reads are expensive (every get deserializes the whole value): loops read a local mirror updated by the change handler. Only direct assignment replicates (`state.x.y = v` does not); granular keys are flat (`state['x:y']`). A removed value is `false`, never `null`.
- Per-entity data goes into the entity's state bag; shared runtime state into per-key `GlobalState` with a subscribe helper; never broadcast whole configs.
- A client waits for a server-created entity with `waitFor(() => NetworkDoesEntityExistWithNetworkId(netId))`, then `NetToVeh/NetToPed/NetToObj`. entity↔netId conversion goes through one helper. Never send entity handles or player indices between machines.
- `GetEntityArchetypeName` does not exist on the server: validate a model with `GetHashKey(model) === GetEntityModel(entity)`.

## @aicore-fivem/lib (instead of ox_lib)

ai-* resources never import ox_lib (owner decision); the lib covers what ox_lib was used for. Missing something ox_lib had? Add it to the lib, never pull ox_lib in.

- Callbacks: server `onClientCallback` (same forms and gate as `onClientEvent`; a refused call rejects the client's promise at once), client `triggerServerCallback(name, [args], timeoutMs?)`; the reverse direction `onServerCallback` / `triggerClientCallback(name, src, [args])`. Answers are `unknown`: parse them. No hand-made request/response event pairs.
- Lang: `createLocale<typeof en>()` from `@aicore-fivem/lib/fivem` (the template's `resource/common/locale.ts`).
- Keybinds: client `new Keybind({ name, description, defaultKey, onPressed, onReleased })`; the name contains the default key (`name_<KEY>`); mouse buttons need `defaultMapper: "MOUSE_BUTTON"`.
- Player values: `cache.ped`, `cache.playerId`, `cache.serverId`, `cache.vehicle`, `cache.seat`, `cache.weapon` (`false` = none) instead of calling natives in loops; `onCache(key, (value, old) => ...)` reacts to a change. One watcher in ai-core (100 ms) feeds every resource; nobody polls these.
- Areas: lib `Zones` (`sphere`, `cylinder`, `poly`; each zone its own `interval` ms, default 500; `onEnter` / `onExit`). Never a hand-written distance loop; per-frame work only while inside, and only when it must draw.
- "Press E" prompts: `showPrompt(id, text)` on enter, `hidePrompt(id)` on exit, `onPromptPressed(id => ...)` (ai-core's right-side prompt UI and its one rebindable interaction key). Never GTA help text (`BeginTextCommandDisplayHelp`) or per-frame `IsControlJustReleased`.
- Waiting and loading: `sleep`, `waitFor` (resolves on the first non-`undefined` value, write `cond || undefined`; default timeout 10 s, `false` for none), `requestModel`, `requestAnimDict`, `requestPtfxAsset`.

## JS runtime

- On the server, return to the game thread with `setImmediate` before calling a native inside a Node callback (fs, http, Node timers), or it fails with "No current resource manager".
- Client code has no DOM/Node APIs (fs, Buffer, localStorage, fetch); packages using them never enter the client bundle.
- Never write bare `exports` in source and never `export` a value from an entry file (the script shows "Started" but does not load). Use `registerExport(name, fn)` / `resourceExport("ai-core").fn()` from `@aicore-fivem/lib`.

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

- ACE: `group.admin` is a principal, `IsPlayerAceAllowed(src, "group.admin")` is always false. In JS `IsPlayerAceAllowed` returns `1`/`0`: wrap in `Boolean(...)`. Restricted commands use `restricted: "group.admin"`. ACE lines live in `permission.cfg`.
- Players do not type commands; every feature has a UI. Only developer test commands exist, restricted.

## Natives

- Before using a native new to the codebase, verify it with the `tgiann-fivem-dev` skill's `tools/native.py` (name, argument order, client/server apiset).
- Clothing is addressed by collection name + local index (`SetPedCollectionComponentVariation`), never by global drawable index.
- DUI is created once and lives forever; `DestroyDui` only in `onResourceStop`.
