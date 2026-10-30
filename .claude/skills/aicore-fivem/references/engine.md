# FiveM engine notes

Engine behaviour, native pitfalls and network patterns found while building ai-core. Each line is something that cost time once. TypeScript examples use the same native names as Lua (PascalCase).

## State bags

- Per-entity runtime state (lock, fuel, siren) is an entity state bag written by the server; clients react with `AddStateBagChangeHandler`. A replay on scope-in replaces any periodic rebroadcast.
- A change handler can fire before the entity exists locally: resolve it with `GetEntityFromStateBagName` inside a short wait (about 2 s) and check the entity type.
- Never set `nil`: a client out of scope does not see the removal. Write `false`.
- Every read deserializes the whole value; only direct assignment replicates (`state.x.y = v` does not). Granular keys are flat (`state["x:y"]`); loops read a local mirror the handler updates.
- When a player or entity with a bag enters scope, the bag replicates again and the handler fires on that client by itself: no extra `playerEnteredScope` bridge. Out of scope, `GetPlayerFromStateBagName` returns 0; ignore it.
- Shared runtime state (door locks, heist stages) is per-key `GlobalState`, never a whole config broadcast. A record set with a varying number of keys uses one handler (`AddStateBagChangeHandler(null, "global", ...)`) filtered by key prefix. GlobalState survives a resource restart: read the old value back and restart pending timers with the time left.

## Runtime costs (JS/TS)

- An empty `setTick` or a 1 s `setInterval` costs about 0.05 ms in resmon (Lua `Wait(1000)` costs 0): one shared tick per resource (lib `every`), cleared when idle.
- Exports and cross-resource events copy their data (functions pass as references). Large or frequent payloads stall the server: never return whole objects from an export, never call another resource's export on a hot path; mirror the data and follow delta events.
- Latent events: `bps` is BYTES per second (default 25000). The payload is held in memory and sliced per tick on its own channel.
- msgpack (events, exports, state bags) silently drops anything deeper than 16 levels: send deep data as a JSON string and parse it at the last stop. `SendNUIMessage` is JSON and has no such limit.
- An export that returns several values loses everything after a `nil`; return a table or `ok, result`.

## `provide`, exports and detection

- While a resource that `provide`s `x` runs: `GetResourceState("x")` is `started`, `dependency "x"` is met, `GetResourceMetadata("x", ...)` reads the provider's manifest, and `@x/path/file.lua` includes resolve inside the provider.
- Exports are not redirected: `exports.x:fn` fires the local event `__cfx_export_x_fn`; the provider answers it itself (`on("__cfx_export_x_fn", (setCb) => setCb(fn))`). If the original resource also runs, the two collide.
- A provided name is not a resource of its own: `GetNumResources` / `GetResourceByFindIndex` list only real folders.
- Paid scripts detect frameworks with `GetResourceState` in their own order (some compare `== "started"`, some `~= "missing"`) and get the core object through `exports["qb-core"]:GetCoreObject()`, the old `TriggerEvent("QBCore:GetObject", cb)` or `exports.es_extended:getSharedObject()`. A bridge answers every one of these.
- "Execution of function reference in script host failed" means a resource called a function reference whose owner is dead or not ready yet (usually during a live restart); it is timing, not a load error. A real load error prints `@resource/file:line`. `GetResourceState(x) === "started"` does not close the race: exports may not be registered yet, so wrap such calls.

## Official docs findings

- FiveM for GTAV Enhanced reuses server ids after a player leaves: nothing persistent is keyed by `source`; per-source maps are cleared on drop; a delayed job checks the source is still the same character.
- On a client, a net event from the server has a source; a local emit has none (use this to drop faked calls).
- `add_convar_permission <res> read <convar>` locks a convar to the listed resources (database strings, webhooks). Secrets are set with `set`, never `setr` / `sets`.
- Server list metadata (name, description, tags, banners) lives in the Cfx Portal (portal.cfx.re); FXServer no longer reads `sv_projectName`, `sv_projectDesc`, `tags`, `locale`, `banner_*` from the cfg.
- `sv_endpointPrivacy` is gone; delete the line. `lua54` is no longer needed (every Lua script is 5.4).
- Sandbox: a resource writes only into its own folder; no child processes without a server.cfg permission.
- `playerConnecting` deferrals: wait at least one tick between `defer()` and `update` / `presentCard` / `done`.
- Clothing is stored as collection name + local index (`SetPedCollectionComponentVariation`); global drawable indices shift with title updates.
- The engine has its own fuel use, off by default (`SetFuelConsumptionState(true)`, `SetFuelConsumptionRateMultiplier`, handling `fPetrolConsumptionRate`).
- FiveM caps a server at 2048 players (OneSync).

## JS native returns

- `IsPlayerAceAllowed` returns `1` / `0` in JS even though the typings say `boolean`: `=== true` always fails silently. Use `Boolean(...)` or truthy checks for every BOOL native. `IsPauseMenuActive` returns `1` while open: convert before sending it to the NUI.
- `group.admin` is a principal, not an ace: `IsPlayerAceAllowed(src, "group.admin")` is always false.
- In the JS runtime net-safety is per event NAME: once any handler registers `onNet(name)`, every `on(name)` handler of that name also receives the server's calls (doubles if you listen both ways).

## Entities and vehicles

- On the server `GetEntityPopulationType(entity) === 7` (mission) marks an entity a script created (rentals, job and owned vehicles); ambient traffic has other types. Check stolen ambient cars in game before relying on it.

- The server reads a fresh server-created vehicle's plate (`GetVehicleNumberPlateText`) as empty until the owner client's first sync: set the plate on the server and wait until it reads back before anything keys on it (vehicle keys, garages).

- Strict entity lockdown: networked entities are created on the server (`CreateVehicleServerSetter`, `CreatePed`, `CreateObjectNoOffset`); clients create only local (`isNetwork = false`) entities. Wait for `DoesEntityExist` after creating; a client waits for a server entity with `NetworkDoesEntityExistWithNetworkId(netId)` before `NetToVeh`.
- Server-side `GetVehiclePedIsIn(ped, true)` does not return the vehicle the ped sits in (the "last vehicle" is written only when leaving); replication lags at high ping, so wait instead of checking once.
- Server-side vehicle health natives return 0 until a client owns the entity (`NetworkGetEntityOwner === -1`): never judge "wrecked" on an unowned entity.
- `NetworkDoesNetworkIdExist` + `NetToVeh` spam warnings out of scope; check `NetworkDoesEntityExistWithNetworkId` first.
- A player always owns its own ped: `NetworkGetEntityOwner(ped)` finds its player in O(1).
- Vehicle mod reads and writes need `SetVehicleModKit(vehicle, 0)` first, or reads return -1 and writes do nothing (also on other players' vehicles).
- `GetDisplayNameFromVehicleModel` is the display name, not the model name; addon vehicles differ. `GetEntityArchetypeName` (client only) gives the model name; the server validates with `GetHashKey(model) === GetEntityModel(entity)`.
- `ClearVehicleCustomPrimaryColour` does not always restore the factory colour: keep the original indices from `GetVehicleColours` and set them again.
- Model checks: `IsModelInCdimage` is enough (true also for streamed models not downloaded yet); `IsModelValid` rejects those. Load with a long timeout and re-request about every second.
- Cosmetic entities (previews, lightbar props, offline bodies) are local per client, driven by state bags; networked spawns pile up hidden entities and slow clients.
- `GetClosestObjectOfType` finds objects only, never vehicles: points on vehicle models (boats) scan the vehicle pool (lib model point `vehicles: true`).
- Ped config flag 429 stops the ped starting a vehicle's engine by accelerating; without it a key system that only switches the engine off shows it starting and stalling while W is held.
- Server `SetPedIntoVehicle` right after `CreateVehicleServerSetter` can miss while the entity has no owner yet: retry until `GetPedInVehicleSeat` answers the ped (lib `spawnVehicle` does, every 150 ms up to 2 s).

- `AttachEntityToEntity` with `syncRot` false reads the offset and the rotation in world axes: build them from the parent's matrix and rotation (lc_fuel's nozzle at the fuel cap does this).
- `RopeUnloadTextures` unloads the rope textures for every rope in the scene: call it only when the last rope of the resource is gone.

## Peds, animation, NPCs

- `CreatePed(z)` and `SetEntityCoords` apply the foot offset: from a player's `GetEntityCoords` pass `z - 1.0`. `SetEntityCoordsNoOffset` does not, and the ped sinks 1 m.
- Freezing a clip on its first frame: play it, then every frame `SetEntityAnimSpeed(..., 0.0)` and `SetEntityAnimCurrentTime(..., 0.0)` (speed 0 alone still advances during blend-in).
- Walking the player ped to a point: `TaskGoStraightToCoord(ped, x, y, z, 6.0, -1, heading, 0.0)`; `TaskGoToCoordAnyMeans` is unreliable.
- Prop animations that come as ped + prop pairs run in a synchronized scene (`CreateSynchronizedScene` + `TaskSynchronizedScene` + `PlaySynchronizedEntityAnim`); `PlayEntityAnim` on the prop teleports it. A frozen entity does not play a synced scene. Network synchronised scenes need networked entities.
- Server-created NPCs are controlled by the nearest client and migrate; AI settings (combat attributes, tasks) run only on the controlling client and are not synced. Keep the wanted state in the entity's state bag and let a watchdog on every client apply it when it gains control; re-issue `TaskCombatPed` while `GetIsTaskActive(ped, 343)` is false.
- Without a framework players are friendly to each other: every spawn `NetworkSetFriendlyFireOption(true)` + `SetCanAttackFriendly(PlayerPedId(), true, false)`.
- Ground height at a far, unloaded point: hold the ped there while the screen is dark and cast from `GetHeightmapTopZForPosition(x, y) + 50`; `GetGroundZFor_3dCoord` alone usually fails.
- Scenario props (BBQ spatula, cups) are held as the ped's weapon object and fall when the task is cleared: delete attached non-mission objects before `ClearPedTasks`.
- "Plays any animation" has no native: ask the running tasks, `GetIsTaskActive(ped, 134)` (TaskPlayAnim), `135` (synchronized scene), `118` (scenario); a gesture key (hands up) does not start over them.
- The pointing move network (`task_mp_pointing`, `anim@mp_point`) wants the camera's relative heading in radians for its blocked-capsule spot; stop it when the player aims, falls, melees or ragdolls, or the arm stays up.
- Taking clothes off and back on: read the worn piece as collection name + local index (`GetPedCollectionNameFromDrawable` / `GetPedCollectionLocalIndexFromDrawable`, props `...FromProp`), put the base-game "off" drawable per freemode sex (pants 61 / 14, shoes 34 / 35, top 252 / 74 with undershirt 15, arms 15, decals 0; props cleared), restore with `SetPedCollectionComponentVariation` / `SetPedCollectionPropIndex`. The owning client changes its ped; clothes replicate (ai-inventory `client/clothes.ts`).
- The player's character inside a NUI without a separate camera: a local copy (`CreatePed(..., false, false)` + `ClonePedToTarget`) placed by `SetEntityMatrix` with axes scaled 0.2 right in front of the rendered camera, at depth `height * 0.2 / (areaShare * 2 * tan(fov / 2))` under the area's screen point (`GetWorldCoordFromScreenCoord`), so it fills the area without touching walls or ground; every frame `SetIkTarget(ped, 1, ped, 12844, ...)` + `ForcePedMotionState(ped, MotionState_None)` stop it turning its head and stepping, `SetEntityLocallyInvisible(player)` hides the real one, `DrawLightWithRange` lights it, and the screen blur goes off (it would blur the copy). Re-clone after a clothes change (ai-inventory `client/worldPed.ts`).

## Input, NUI focus, raycasts

- `SetNuiFocusKeepInput(true)` passes the keyboard, never mouse clicks: catch clicks in a transparent NUI layer and send them back with `GetNuiCursorPosition()` / `GetActiveScreenResolution()`.
- Screen rays come from the rendered camera (`GetFinalRenderedCamCoord/Rot/Fov`) so they follow camera interpolation; `GetWorldCoordFromScreenCoord(sx, sy)` gives origin and direction directly.
- Per-frame raycasts use async probes (start one per frame, read the previous handle) or the synchronous expensive probe; never a wait loop per frame.
- A raycast that ignores the player ped also ignores the vehicle it sits in.
- The key a player bound to a `RegisterKeyMapping` command: `GetControlInstructionalButton(0, GetHashKey("+command") | 0x80000000, true)` returns `t_X` (strip `t_`), and follows the player's own rebinding in the settings.
- Key mappings cannot combine modifiers: read modifiers with `IsRawKeyDown(vk)` while the mapping's handler runs. Control 177 is also bound to the right mouse button: in mouse-look screens use 194 (Backspace) or 200/322 (Esc) to cancel.
- Many world markers: let the NUI project and move them (one camera message per change, DOM transforms in one rAF) instead of per-frame native draws.

## Radar and blips

- Do not gate `DisplayRadar` on `IsRadarHidden`: it does not reliably reflect `DisplayRadar(false)`. Compute the wanted state and apply it.
- The health / armour bars under the minimap: every frame while it shows, call the `minimap` scaleform's `SETUP_HEALTH_ARMOUR` with 3 (`BeginScaleformMovieMethod` + `ScaleformMovieMethodAddParamInt(3)`); a one-time call is undone by the game.
- `SetBlipCategory(blip, id)`: 12-133 are named custom categories (`AddTextEntry("BLIP_CAT_" + id, label)`); two scripts using the same id merge into one group.

## Audio submixes

- FiveM has 40 audio submix slots (`kSubmixCount` in NuiAudioSink.cpp), shared with the game's own audio. Past the limit `CreateAudioSubmix` returns -1 ("Exceeded maximum number of audio submixes"); older builds overwrote memory (the "voice bugs out" reports). A submix is cached by name for the game session and can never be deleted: create each once, reuse by name (ai-voice's submix registry), and a disabled submix frees its slot only after the player restarts the game.

## DUI

- `DestroyDui` does not free everything: create a DUI once and keep it for the resource's lifetime; destroy only in `onResourceStop`.
- `IsDuiAvailable` does not mean the page listens yet: the page posts a ready callback after mount and the script waits for it. Create the runtime texture only after the DUI is available (binding it in the same frame crashed the game).
- Mouse natives: `SendDuiMouseMove`, `SendDuiMouseDown/Up(dui, "left")`, `SendDuiMouseWheel`.

## Research: how GTA does it

- Decompiled game scripts (story + Online, Legacy build = FiveM): https://github.com/Tessio/v-decompiled-scripts (folder `decompiled scripts - legacy`). Read how Rockstar built shop cameras, creators, interiors and minigames before designing one (`clothes_shop_mp.c`, `hairdo_shop_mp.c`, `maintransition.c`, `am_mp_*`). Files are huge: search by file name, then grep inside.
