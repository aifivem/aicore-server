# Official FiveM docs digest

What the official documentation (docs.fivem.net) says that affects how we build, read page by page on 2026-10-29. Runtime, event, state bag and latent event basics are in `fivem-runtime.md`; this file adds the rest. Every line is **[official]** unless marked; "→" lines are what it means for us.

## Resources and manifest

- Any folder under `resources/` is a resource, except `[bracketed]` folders, which are categories (nestable; `ensure [category]` starts all of them).
- `fxmanifest.lua` runs in its own Lua runtime. `fx_version 'cerulean'` is current: NUI runs in a secure context, so NUI callbacks use `https://`. `game 'gta5'`.
- Script directives (`client_script`, `server_script`, `shared_script`) support globbing (`**/*.js`). `files` lists what clients download (required for `ui_page`, `loadscreen`). `server_only` stops clients downloading the resource at all.
- `dependencies` can carry runtime constraints: `/server:<build>`, `/onesync`, `/gameBuild:<build>`, `/native:<hash>`, `/policy:<name>`.
- `provide 'name'` marks a resource as a replacement for another, so it starts in its place when required.
- `lua54` is deprecated and unnecessary: Lua 5.3 was removed in June 2025, every Lua script is 5.4.
- `node_version '16' | '22'` picks the server Node version (16 is the default).
- `use_experimental_fxv2_oal 'yes'` (Lua): correct native return types and faster calls, but vectors are not unpacked and wrong argument types are silently converted.
- Manifest metadata is readable at runtime with `GetNumResourceMetadata` / `GetResourceMetadata`.
- → Bridges use `provide 'es_extended'`, `provide 'qb-core'`, `provide 'qbx_core'` and no `lua54` line. Our TS resources declare `dependencies { '/onesync', '/server:<min build>' }` so a wrong server fails loudly at start.

## Sandbox

- A resource may write only inside its own folder; writing into another resource is blocked for every file type (`SaveResourceFile` included). Symlinks and `..` traversal are rejected; blocked calls fail with error 13.
- `os.execute` is blocked, `io.popen` only emulates `ls`/`dir`, `io.tmpfile` is blocked.
- `server.cfg` overrides, all dangerous: `add_filesystem_permission <res> write <target>`, `add_unsafe_worker_permission <res>`, `add_unsafe_child_process_permission <res>`.
- `add_convar_permission <res> read <convar>`: convars are readable by every resource by default; once a permission exists for a convar, only permitted resources can read it.
- → Each resource keeps its panel data in its own `data/*.json`; core never writes into another resource. Secrets (DB connection string, webhooks) are locked with `add_convar_permission` to the resources that need them.

## Network and local IDs

- A player's server ID (`source`) is transient. A client's player index is local, does not exist on the server and does not round-trip.
- Entity handles are local to one machine and may differ per client; recreating an entity may change its handle.
- A network ID is constant for an entity's lifetime but can be reused by later entities; it may not be in scope on a client, so check `NetworkDoesEntityExistWithNetworkId` first.
- **FiveM for GTAV Enhanced reuses player IDs** after a disconnect (Legacy never did).
- → Never store entity handles or player indices across machines; send network IDs / server IDs. Never key anything persistent by `source`; key it by character/user id. Clear every per-source structure on drop, or a reused id inherits the old player's state.

## OneSync

- Free up to 48 slots; above that a paid tier. Infinity supports up to 2048 players; object IDs go up to 65535.
- Entities and players are culled outside a 424-unit focus zone, so player iteration belongs on the server. Out-of-scope entities migrate or become server-owned ("unowned").
- `playerEnteredScope` / `playerLeftScope` fire once per player in scope (32 players in scope = 32 calls per enter/leave); the docs recommend state bags instead.
- Server-side creation: `CreateVehicleServerSetter(hash, type, x, y, z, heading)`, server `CreatePed`. `SetEntityOrphanMode(entity, 2)` (KeepEntity) stops the server deleting a server-created entity; clients can still request deletion.
- Some natives are RPCs that run on the owning client (`CreateVehicle`, `TaskWarpPedIntoVehicle`, `SetEntityVelocity`); RPCs are fallible and not guaranteed.
- Routing buckets split visibility of players and entities; each bucket has its own population grid. `SetRoutingBucketEntityLockdownMode`, `SetRoutingBucketPopulationEnabled`. Not for interiors (use conceal natives). Cookbook (2020): game events such as explosions may still cross buckets, and no per-bucket event targeting exists.
- → Vehicles and peds that must persist are created on the server with orphan mode 2. Lobby/match/character-select instancing uses buckets owned by core in one place.

## Security

- Use `AddEventHandler` for same-side events and `RegisterNetEvent` / `onNet` only for cross-network ones. A registered net event can still be called from the same side; on the client, server-sent events have `source == 65535`, so a client handler can reject anything else.
- Never trust client values: re-read money, items, position, permissions on the server. Reference pattern: the server tracks the job state per source (start in range → server tick counts progress → turn-in in range clears the state before rewarding the server-tracked amount).
- `source` is only valid until the first `Wait` / `await`; copy it to a local first.
- Security convars (most on by default since build 8450): `sv_kick_players_cnl_timeout_sec`, `sv_pure_verify_client_settings`, `sv_authMaxVariance` (1-5, default 5, lower = more stable ids), `sv_authMinTrust` (1-5, default 1), `sv_filterRequestControl`, `sv_disableClientReplays` (also disables the Rockstar Editor).
- `sv_filterRequestControl`: `0` off, `1` blocks settled player-occupied vehicles, `2` all player-controlled entities, `3` also settled non-player entities, `4` stops routing control requests entirely, `-1` like 2 plus a warning.
- `sv_entityLockdown`: `inactive` (default), `relaxed` (script-owned client entities blocked), `strict` (no client entities), `full` (also no dummy objects; Enhanced only).
- Others: `sv_pureLevel 1|2`, `sv_requestParanoia 0-3` (proxied HTTP floods), `sv_scriptHookAllowed false`, `rcon_password` (empty disables RCON).
- `sv_endpointPrivacy` is removed (the docs page still lists it): FXServer no longer exposes player endpoint addresses on any HTTP endpoint and warns when the convar is set **[server log, 2026-10-29]**.
- `sv_projectName`, `sv_projectDesc`, `tags`, `locale`, `banner_detail`, `banner_connecting` are no longer read: server list metadata lives in the Cfx Portal since 2026-10-21 **[server log + cfx forum]**.
- → Our `security.cfg`: lockdown `strict`, `setr sv_stateBagStrictMode true`, `sv_filterRequestControl 4`, networked sounds and script entity states off, `sv_pureLevel 1`, script hook off. RCON is on only on dev servers.

## Server events

- `playerConnecting(name, setKickReason, deferrals)`: after `deferrals.defer()` wait at least one tick before `update` / `presentCard` / `done`; `done()` lets the player in, `done(msg)` refuses. `source` here is a temporary id; `playerJoining(source, oldId)` gives the final one.
- `playerDropped(reason, resourceName, clientDropReason)`; in JS the player is `global.source`.
- `entityCreating(handle)` can be cancelled to delete the entity at once; `entityCreated`, `entityRemoved`.
- `onResourceStarting` can be cancelled; `onResourceStart` / `onResourceStop` fire immediately, `onServerResourceStart` / `onServerResourceStop` queued later.
- `weaponDamageEvent(sender, data)` is cancellable; `ptFxEvent`, `startProjectileEvent`, `removeAllWeaponsEvent` carry sender + data for validation.
- Cancelling (`CancelEvent`) works only on events not triggered across the network and never stops other handlers; `WasEventCanceled` works for local events only.
- → ai-anticheat style checks hook `weaponDamageEvent`, `ptFxEvent`, `startProjectileEvent`, `entityCreating`. The txAdmin events we rely on (`txAdmin:events:serverShuttingDown`, `playerHealed`) are not in the docs; ox_core uses them **[code]**.

## Commands and ACL

- Always `RegisterCommand(name, handler, restricted)`; `restricted = true` requires the ACE `command.<name>`. Enhanced adds `UnregisterCommand(id)`.
- ACL: `add_ace <principal> <object> allow|deny`, `add_principal <child> <parent>`, `remove_principal`, `test_ace`. ACLs have no persistence; a framework stores its own and re-applies them (cookbook: grant `resource.<name>` the `command.add_principal` / `command.remove_principal` ACEs, then `ExecuteCommand`). Other resources can then check `IsPlayerAceAllowed(src, '<object>')` without depending on the framework.
- → Core stores roles in the DB and mirrors them into ACL principals at load, so even non-ai resources can check permissions with plain `IsPlayerAceAllowed`. Players never type commands; dev commands stay `restricted`.

## Convars

- `set` (server scripts only), `setr` (replicated: server and client scripts read it, only the server writes), `sets` (also shown in server info / `info.json`). Standard convars cannot be read from client scripts.
- Setting a convar through `ExecuteCommand` needs the `command.set` ACE.
- → Secrets always `set`, never `setr`/`sets`. Client-visible switches (locale, debug HUD) use `setr`.

## NUI

- Callback URL `https://<resource>/<name>`, POST with a JSON body; the data must be JSON-encodable.
- Every handler path must call `cb`, or the UI request hangs until it times out. Even a placeholder `{ ok: true }` satisfies this.
- → Matches our `{ ok, error? }` response rule.

## Game features worth using

- **Collection-based clothing natives** (client, GTA V): drawables and props addressed by collection name + local index stay stable across title updates; global indexes of custom content shift. `SetPedCollectionComponentVariation`, `SetPedCollectionPropIndex`, `GetPedDrawableVariationCollectionName/LocalIndex`, `IsPedCollectionComponentVariationValid` (an invalid index is silently not applied). → Saved clothing is always `{ collection, localIndex, texture }`, never a global drawable index.
- **Engine fuel consumption** is off by default: `SetFuelConsumptionState(true)`, global `SetFuelConsumptionRateMultiplier` (default 1), per vehicle `fPetrolConsumptionRate` (default 0.5) and `fPetrolTankVolume` (0 = infinite), `GetVehicleFuelLevel` / `SetVehicleFuelLevel`, `DoesVehicleUseFuel`. Consumption scales with RPM, stops with the engine off, NPC-only vehicles and bicycles don't consume. No refuelling is provided. → A fuel script uses the engine's own consumption instead of a per-tick Lua/JS loop.
- `GetActivePlayers()` instead of looping 0-255 player slots on the client.

## FiveM for GTAV Enhanced (early access)

- Removed: P2P sync, OneSync non-big mode, `+set moo 31337` (use `sv_devMode true`), Asset Escrow (not yet), mumble deprecated. `sv_useAccurateSends` → `sv_syncTickRate` (default 60, 1-120).
- Breaking: player IDs are reused; KVP database files need migration; remote command output needs `PrintRemoteCommandLog`; resources can no longer be builders; pure mode always on; `stream_enhanced/` replaces `stream/` when present (Gen8 assets in `stream`, Gen9 in `stream_enhanced`).
- State bags on Enhanced: change callbacks fire only if the entity exists; values replicate only when explicitly set.
- → Write for both: no id-reuse assumptions, no resource builders (we ship built `dist/`), entity-existence checks in state bag handlers.

## Debugging

- Hitch warnings usually mean slow SQL or blocking loops.
- Profiler on client (F8) and server: `profiler record 500`, `profiler status`, `profiler view` (server prints a link to open in Chrome), `profiler saveJSON file.json`; load in Chrome DevTools > Performance. The yellow CPU graph spikes are the hitches; hovering a resource tick shows file and line.
- `resmon true` on the client (needs dev mode in production builds: `sv_devMode true` on Enhanced).

## Sources

docs.fivem.net pages read: scripting-manual (introduction, introduction-to-resources, creating-your-first-script-javascript, about-native-functions, fact-sheet, runtimes/javascript, runtimes/lua, debugging/using-profiler, networking/ids, networking/state-bags, working-with-events and its three subpages, nui-development/nui-callbacks, migrating-from-deprecated/creating-commands, using-new-game-features/collection-based-natives, fuel-consumption), scripting-reference (resource-manifest, convars, onesync, events/server-events, events/list/playerDropped, runtimes/javascript/server-functions), server-manual (server-commands, frameworks), developers (server-security, script-runtimes, sandbox, legacy-vs-enhanced), resources/txAdmin, support/server-debug, cookbook (routing buckets 2020-11-27, OneSync server-side persistence 2020-07-10, built-in ACL 2021-07-17, GET_ACTIVE_PLAYERS 2019-06-29).
