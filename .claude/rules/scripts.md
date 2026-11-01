---
paths:
  - "resources/**/*.{ts,tsx}"
  - "template/**/*.{ts,tsx}"
---

# Writing or changing a script (hard rules)

Every ai-* script is built from the lib and ai-core; nothing here is optional. A second copy of something the lib does is a defect, even when it works. If the lib lacks what you need and a second script will need it too, add it to `@aicore-fivem/lib` (with JSDoc, a line in `lib.md`, a bench when it holds a collection) and use it from there.

## Before writing

- Read the script's `CLAUDE.md` and the folder `CLAUDE.md` of the files you touch, then `lib.md` for the helper you need.
- Search the lib (`packages/lib/src`) and the script for an existing helper before writing a function.

## Need -> use (never)

| Need | Use | Never |
|---|---|---|
| Client -> server request / event | `triggerServerCallback` / `onClientCallback`, `onClientEvent` (with `args` parser and guards) | bare `onNet` on the server, hand-made request/response pairs |
| A player action with a refusal (buy, use, open) | server answers `ActionResult`, refuses with `fail("KEY")`; client `callAction(name, args, { fallback })` | own `fail`, `errorText`, `isObj`, notifying the error by hand |
| A token or net id from a client | `{ args: oneArg(readId) }`, `vehicleFromNet` / `pedFromNet` / `entityFromNet` / `vehicleNearPlayer` | `typeof x === "number"`, `NetworkGetEntityFromNetworkId` checks by hand |
| A timed action the server checks (use, repair, rob, plant) | `await progressFor(source, { label, duration, anim, face })` (server) | a start event + client `progress` + finish callback with a token, own time checks |
| A dialog the server waits for (a note's text) | `PendingActions` with `minRatio: 0` (server) | own token map, counter and drop cleanup |
| A minigame (lockpick, skill check) | lib `lockpick` / `skillCheck` (client), the server still decides | own minigame NUI, a third-party minigame's exports |
| World objects players see around them (drops, plants, bodies, props) | `AreaStream` (server) + `AreaFollower` (client) | own cell grids, watcher sets, snapshot / delta code |
| A full-screen NUI | `NuiScreen` (client: focus, HUD, close message, `close` callback, typed `send`, parsed `on`) | `SetNuiFocus` + `hud.hide` + `RegisterNuiCallback("close")` by hand |
| Per-player server state, cooldowns, character load / unload | `PlayerMap`, `Cooldowns` (per connection), `KeyedCooldowns` (by character id, survives a reconnect), `onCharacter` | `on("playerDropped")` per map, own `Map<id, deadline>`, load listener + restart replay by hand |
| Server -> client | `onServerEvent` (with `args`), `triggerClientCallback` / `onServerCallback` | bare `onNet` on the client |
| A place the player uses (shop, counter, door, NPC, ATM) | `Points` (label, `canShow` with `hasJob` / `inGang` / `onDutyIn` for locked places, `onPressed`, `ped`, `blip`, `models` for model targets) | `Zones` + `showPrompt` + `onPromptPressed` by hand, target exports, help text, `IsControlJustPressed` loops |
| An NPC | `ped` on a point or `LocalPed` | client `CreatePed` by hand |
| A map blip | `blip` on a point, `Blips`, `createBlip` (`route` for a GPS route) | `AddBlipForCoord` + `BeginTextCommandSetBlipName`, `SetBlipRoute` by hand |
| A prop in a ped's hand | `attachProp(model, { ped?, bone, offset?, rotation? })` | `CreateObject` + `AttachEntityToEntity` by hand |
| An animation kept playing (carrying, cuffed) | `player.holdAnim(dict, clip, opts)` | a job re-checking `IsEntityPlayingAnim` |
| A showroom preview vehicle | `PreviewVehicle` | `CreateVehicle` + token + freeze by hand |
| The local ped, its vehicle, seat, weapon | `cache` / `onCache`, `player`, `drivenVehicle()` (driver seat) | `PlayerPedId()` (except right after a model change), polling `GetVehiclePedIsIn`, `cache.seat === -1` checks |
| Another player's ped by server id (client) | `playerPed(serverId)` (0 out of scope) | `GetPlayerPed(GetPlayerFromServerId(id))` (-1 gives the local ped) |
| Teleport, animation, freeze | `player.teleport` / `playAnim` / `freeze`, `fadeOut` / `fadeIn` | fade + coords + collision code by hand, a bare `DoScreenFadeIn` |
| A vehicle created by the server | `spawnVehicle` (with key `purpose`), `vehicleType` | `CreateVehicleServerSetter` + waits + plate + bags by hand, own `vehicleType` callbacks |
| Vehicle keys | `vehicleKeys.give(source, vehicle, purpose)` / `remove` / `has` | a key script's exports |
| Items, stashes, usable items, script shops | lib `inventory` (`registerShop` / `openShop` for a shop the script opens) | an inventory's exports, an own shop NUI |
| Character, money, jobs, gangs, duty | ai-core exports through one top-level `const core = resourceExport("ai-core")`; `online` for lookups across players (`jobGrade`, `jobMembers`, `onDutyFor`) | own tables or copies, `GetLoadedSources()` + an export per player in a loop, `core.GetJobs` for a grade check |
| Players near someone | `playersNear` / `playersNearEntity`; the closest one `nearestPlayer` (client) / `nearestPlayerTo` (server) | walking every player, own scope handlers, `GetActivePlayers` loops |
| A position or distance on the server | `coordsOf`, `entityCoords`, `isNear`, `distance`, `flatDistance` (ground plane), `vehicleOf(source, { driver? })` | own `pos` / `distance` helpers, `GetVehiclePedIsIn(GetPlayerPed(...))` |
| The local ped fired a shot | lib `onShot` (client) | sampling `IsPedShooting` on a timer |
| State bags | `EntityState` / `PlayerState` / `GlobalKey` / `GlobalGroup` | `Entity().state`, `GlobalState`, `LocalPlayer.state`, `AddStateBagChangeHandler`; client writes of any kind |
| A player's phone (number, mail, text, notification) | lib `phone` | a phone script's exports |
| Police (job) alerts | lib `dispatch.alert({ title, code, coords, source, ... })` (server) | an alert script's exports or events, ai-policealert's exports, own blips and notifications for officers |
| A character's saved look, dressing a ped, the player's clothes, clothing / barber / outfit menus, job uniforms | lib `appearance.get(charId)` (server), `appearance.apply(ped, look)` / `read(ped)`, `openMenu(menu)`, `wearOutfit(outfit)` / `reloadSkin()` (client) | a clothing script's exports, events or tables (ai-appearance included), `SetPedComponentVariation` uniforms by hand |
| Hands up / pointing of the local player, playing or stopping an emote | lib `gestures` (`playEmote(name)`, `cancelEmote()`) (client) | an emote script's exports or `e` command |
| The seat belt state | lib `seatbelt.isOn()` / `onChange` (client) | a seat belt or HUD script's exports, ai-smallresources' event |
| Stress up or down | lib `stress.gain` / `relieve` (server) | `hud:server:GainStress` events, ai-hud's `AddNeed` |
| Hunger and thirst to full (revive, hospital) | lib `needs.refill(source)` (server) | ai-hud's `SetNeed`, setting metadata `hunger` / `thirst` by hand |
| Where notifications show | ai-core panel setting `notify` (ai-lib's cards to another UI) | calling a notification script's exports from a script |
| A radial menu entry (job menu, vehicle action) | lib `radial.add({ id, label, icon, parent?, canShow, onPressed })` once at start (client); `radial.refresh()` when what `canShow` reads changes | a radial script's exports (ai-radialmenu included), re-adding on a radial's start |
| Jail a player, release, time left | lib `prison` (server) | a prison script's exports or events (ai-prison included) |
| A vehicle's fuel (read, set, spawn with) | lib `fuel.get` / `set` (server), `fuel.get(vehicle)` (client), `spawnVehicle({ fuel })` | the `fuel` state bag, a fuel script's exports or decorators (ai-fuel included), `GetVehicleFuelLevel` |
| Lock / unlock a door from a script | lib `doors.setLocked(id, locked, by?)` / `isLocked` (server) | a door lock script's exports or events (ai-doorlock included) |
| Impound, store a vehicle, open a garage menu, a player's garaged vehicles | lib `garages.impound` / `store` / `open` / `stored` (server) | a garage script's exports or events (ai-garages included), ai-vehicles' `StoreVehicle` for an impound |
| Time and weather | lib `world` (server get / set, client `pauseSync` / `resumeSync`) | a weather script's exports or events |
| A death | ai-core `CORE.playerDiedEvent` | health polling |
| Revive, heal, is the player down | lib `medical.revive` / `heal` / `isDead` (server), `medical.isDead()` / `onChange` (client) | a death script's exports or state bags (ai-death included), `IsEntityDead(cache.ped)` for "is the player down" (death scripts keep a downed ped alive) |
| Bill a player (fines, service fees, a player's invoice) | lib `billing.send({ to | toCitizenid, amount, label, from?, job? })` (server; `toCitizenid` also reaches an offline character); `billing.unpaid` / `pay` | a billing script's exports or events, a forced `money.transfer` from the target |
| A police record (fine, warrant, arrest, jail) or opening the MDT | lib `mdt.record(...)` (server), `mdt.open()` (client) | an MDT's exports or events |
| How many medics are free, a distress call | lib `ems.available(jobs)` / `ems.distress(source, { jobs })` (server) | `online.countOnDuty` for that rule, an ambulance or alert script's exports |
| Open a bank screen, a banking script's own society balance | lib `banking.open(source)` / `societyBalance(job)` (server) | a banking script's exports; moving job money anywhere but ai-core (`money`) |
| Money from one account to another (bank transfer, deposit, society) | lib `money.transfer(from, to, amount, reason, fee?)` (one transaction) | a `RemoveMoney` + `AddMoney` pair |
| A separate world (instanced interior, robbery house) | lib `buckets.acquire(tag)` / `release(id)` (server) | own bucket numbers (`base + n`) |
| Engine happenings | `gameEventTriggered`, `entityDamaged`, server entity events (`aicore-fivem` `events.md`) | polling for them |
| Settings a server owner tunes | `AdminPanel` + `schema.ts` (`admin-panel.md`); client reads `AdminWorld` | config files, convars, constants |
| Points, blips, peds of panel records | `RecordObjects` (one record's objects rebuilt per edit) | `points.clear()` + add everything on a change |
| Who may use a place (jobs, gangs, grades, on duty) | the record's access fields: `ACCESS_FIELDS` / `accessFields()`, `readAccess`, `online.allows` (server), `allows` (client) | own jobs / gangs / grade checks, a client check that differs from the server's |
| Entries other resources register through your exports | `ByResource` / `Reasons` / `caller()` | own maps keyed by `GetInvokingResource()` and `onResourceStop` cleanup |
| Cleanup when this resource stops | `onStop(fn)` | `on("onResourceStop", (r) => r === ResourceName && ...)` |
| Players who get one key's deltas (a lot, an open character) | `KeyWatchers` (server) | own `Map<key, Set>` + reverse map + drop cleanup |
| A countdown or growth on the server's clock (client) | `ServerClock` | own `offset` fields |
| Random numbers, picks, chances | `randomInt` / `pickRandom` / `rollChance` | `Math.floor(Math.random() * ...)` copies |
| A plate as a key | `plateOf` / `normalizePlate` | raw `GetVehicleNumberPlateText`, own trim / upper |
| A scripted camera | `ScriptCamera` | `CreateCam` / `RenderScriptCams` / `DestroyCam` by hand |
| Server commands / key binds | `addCommand` / `Keybind` | `RegisterCommand`, `RegisterKeyMapping` |
| Player-facing text | `Locale("KEY")` from `locales/en.json` | literals |
| A full-screen UI (inventory, bank, shop, editor) | `NuiScreen` (it calls `hud.hide` / `hud.show`); `hud.hide("<screen>")` by hand only for a screen without a NUI page | hiding the HUD or the radar by hand |
| A key the player should know (open keys, tool controls) | `Keybind` `hint`, lib `keyHints.show` / `hide` for temporary ones | own on-screen key help |
| Notifications, progress, menus, inputs | lib `notify`, `progress`, `menu`, `input` | own NUI for them |
| Logs | `aiLog` | `console.log` for events, webhooks |
| Waiting and loading | `waitFor`, `sleep`, `requestModel`, `requestAnimDict`, `requestAnimSet`, `requestPtfxAsset` | `while (!x) await sleep()` |
| Periodic work (per frame or every N ms) | lib `every(ms, fn)` (0 = every frame; switched with `set(active)` while needed), `TickLoop` for an on / off per-frame job | `setInterval`, `setTick`, a self-rearming `setTimeout`, idle jobs |
| Disabled controls (cuffed, seat belt, menus) | lib `controls.disable(reason, list)` / `controls.disableAll(reason, except?)` / `enable(reason)` | a `TickLoop` or tick per feature calling `DisableControlAction` / `DisableAllControlActions` |
| The vehicle near the player or a point | lib `nearestVehicle` (client, `filter` for a condition, `from` for a point), `nearestVehicleTo` / `nearestVehicleAt` (server) | own pool loops, `GetClosestVehicle` |
| The closest ped / object, entities in an area, a free spawn spot (client); players near a point (server) | lib `nearestEntity(kind, from?, max?, { filter, ignoreLocal })`, `entitiesInArea(kind, coords, radius)`, `isSpawnClear(coords, radius)`; `playersNearCoords(coords, radius, bucket?)` | own `GetGamePool` / `GetPlayers` loops |
| A scaleform movie | lib `requestScaleformMovie(name, timeoutMs?)` (handle or 0) | `RequestScaleformMovie` + a wait loop |
| A server entity on the client by net id | lib `waitForEntity(netId)` (waits), `entityFromNetId(netId, type?)` (now or 0) | `NetworkDoesEntityExistWithNetworkId(...)` + `NetToVeh` by hand |
| A line of sight / surface probe (client) | lib `raycast(from, to, options)` | `StartExpensiveSynchronousShapeTestLosProbe` + `GetShapeTestResult` by hand |
| A NUI page's lang texts (web) | `web/src/lib/lang.ts` wrapping lib `LangTexts` | own text store or placeholder code |
| Areas without an interaction | `Zones` | distance loops |
| Another resource's exports | one top-level `resourceExport("x")` / `optionalExport` per call for optional ones | `resourceExport("x").Fn()` inside functions |
| Database | `db` (typed tables) / `mysql` | oxmysql exports, raw string SQL with values |

## After changing

- `bun run typecheck`, `bun run lint`, `bun run build` in the script; restart it over RCON and read the log; commit source and build together.
- Prettier formats (`bun run format` or format on save).
- Write down what you learned (a rule here or in `lib.md`, a mechanism in the skill or the script's `CLAUDE.md`).
