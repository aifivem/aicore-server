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
| A token or net id from a client | `{ args: oneArg(readId) }`, `vehicleFromNet` / `vehicleNearPlayer` | `typeof x === "number"`, `NetworkGetEntityFromNetworkId` checks by hand |
| A timed action the client runs (progress, dialog) | `PendingActions` (server) | own token map, counter, time check and drop cleanup |
| Per-player server state, cooldowns, character load / unload | `PlayerMap`, `Cooldowns`, `onCharacter` | `on("playerDropped")` per map, load listener + restart replay by hand |
| Server -> client | `onServerEvent` (with `args`), `triggerClientCallback` / `onServerCallback` | bare `onNet` on the client |
| A place the player uses (shop, counter, door, NPC, ATM) | `Points` (label, `canShow`, `onPressed`, `ped`, `blip`, `models` for model targets) | `Zones` + `showPrompt` + `onPromptPressed` by hand, target exports, help text, `IsControlJustPressed` loops |
| An NPC | `ped` on a point or `LocalPed` | client `CreatePed` by hand |
| A map blip | `blip` on a point, `Blips`, `createBlip` | `AddBlipForCoord` + `BeginTextCommandSetBlipName` |
| The local ped, its vehicle, seat, weapon | `cache` / `onCache`, `player` | `PlayerPedId()` (except right after a model change), polling `GetVehiclePedIsIn` |
| Teleport, animation, freeze | `player.teleport` / `playAnim` / `freeze`, `fadeOut` | fade + coords + collision code by hand |
| A vehicle created by the server | `spawnVehicle` (with key `purpose`), `vehicleType` | `CreateVehicleServerSetter` + waits + plate + bags by hand, own `vehicleType` callbacks |
| Vehicle keys | `vehicleKeys.give(source, vehicle, purpose)` / `remove` / `has` | a key script's exports |
| Items, stashes, usable items | lib `inventory` | an inventory's exports |
| Character, money, jobs, gangs, duty | ai-core exports through one top-level `const core = resourceExport("ai-core")`; `online` for lookups across players | own tables or copies, `GetLoadedSources()` + an export per player in a loop |
| Players near someone | `playersNear` / `playersNearEntity`; the closest one `nearestPlayer` (client) / `nearestPlayerTo` (server) | walking every player, own scope handlers, `GetActivePlayers` loops |
| A position or distance on the server | `coordsOf`, `entityCoords`, `isNear`, `distance` | own `pos` / `distance` helpers |
| The local ped fired a shot | lib `onShot` (client) | sampling `IsPedShooting` on a timer |
| State bags | `EntityState` / `PlayerState` / `GlobalKey` / `GlobalGroup` | `Entity().state`, `GlobalState`, `LocalPlayer.state`, `AddStateBagChangeHandler`; client writes of any kind |
| A player's phone (number, mail, text, notification) | lib `phone` | a phone script's exports |
| Police (job) alerts | lib `dispatch.alert({ title, code, coords, source, ... })` (server) | an alert script's exports or events, ai-policealert's exports, own blips and notifications for officers |
| Hands up / pointing of the local player | lib `gestures` (client) | an emote script's exports |
| A radial menu entry (job menu, vehicle action) | lib `radial.add({ id, label, icon, parent?, canShow, onPressed })` once at start (client); `radial.refresh()` when what `canShow` reads changes | a radial script's exports (ai-radialmenu included), re-adding on a radial's start |
| Time and weather | lib `world` (server get / set, client `pauseSync` / `resumeSync`) | a weather script's exports or events |
| A death | ai-core `CORE.playerDiedEvent` | health polling |
| Revive, heal, is the player down | lib `medical.revive` / `heal` / `isDead` (server) | a death script's exports (ai-death included) |
| Money from one account to another (bank transfer, deposit, society) | lib `money.transfer(from, to, amount, reason, fee?)` (one transaction) | a `RemoveMoney` + `AddMoney` pair |
| A separate world (instanced interior, robbery house) | lib `buckets.acquire(tag)` / `release(id)` (server) | own bucket numbers (`base + n`) |
| Engine happenings | `gameEventTriggered`, `entityDamaged`, server entity events (`aicore-fivem` `events.md`) | polling for them |
| Settings a server owner tunes | `AdminPanel` + `schema.ts` (`admin-panel.md`); client reads `AdminWorld` | config files, convars, constants |
| Server commands / key binds | `addCommand` / `Keybind` | `RegisterCommand`, `RegisterKeyMapping` |
| Player-facing text | `Locale("KEY")` from `locales/en.json` | literals |
| A full-screen UI (inventory, bank, shop, editor) | `hud.hide("<screen>")` on open, `hud.show("<screen>")` on close | hiding the HUD or the radar by hand |
| A key the player should know (open keys, tool controls) | `Keybind` `hint`, lib `keyHints.show` / `hide` for temporary ones | own on-screen key help |
| Notifications, progress, menus, inputs | lib `notify`, `progress`, `menu`, `input` | own NUI for them |
| Logs | `aiLog` | `console.log` for events, webhooks |
| Waiting and loading | `waitFor`, `sleep`, `requestModel`, `requestAnimDict`, `requestPtfxAsset` | `while (!x) await sleep()` |
| Per-frame work | `TickLoop` (on only while needed) | idle `setTick` |
| Disabled controls (cuffed, seat belt, menus) | lib `controls.disable(reason, list)` / `controls.disableAll(reason, except?)` / `enable(reason)` | a `TickLoop` or tick per feature calling `DisableControlAction` / `DisableAllControlActions` |
| The vehicle near the player | lib `nearestVehicle` (client), `nearestVehicleTo` (server) | own pool loops, `GetClosestVehicle` |
| Areas without an interaction | `Zones` | distance loops |
| Another resource's exports | one top-level `resourceExport("x")` / `optionalExport` per call for optional ones | `resourceExport("x").Fn()` inside functions |
| Database | `db` (typed tables) / `mysql` | oxmysql exports, raw string SQL with values |

## After changing

- `bun run typecheck`, `bun run lint`, `bun run build` in the script; restart it over RCON and read the log; commit source and build together.
- Prettier formats (`bun run format` or format on save).
- Write down what you learned (a rule here or in `lib.md`, a mechanism in the skill or the script's `CLAUDE.md`).
