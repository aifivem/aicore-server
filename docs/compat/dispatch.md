# Dispatch (police alerts) layer

Every ai-* script sends police alerts through ai-core (owner decision: compatibility lives in ai-core, one change reaches every script). Scripts call lib `dispatch.alert({ code?, title, message?, coords?, jobs?, source?, blip?, duration?, icon?, priority? })` (server; Lua `aiLib.dispatch.alert`); ai-core forwards to the active alert system through one adapter file per system. Texts are translated by the caller.

## How it works

- Server layer: `resources/[ai]/ai-core/resource/server/dispatch/` (`index.ts` exports `SendDispatchAlert(alert) -> boolean`; `registry.ts` lists the adapters in detection order; `adapters/` one file per system; `compat.ts` the QB event and the test command).
- Pick: ai-core panel, General tab, "Police alerts": `auto` (the first running system in registry order) or one system. Picked again when a system starts or stops. With none running an alert goes nowhere (`false`).
- `coords` default to the `source` player's position. `source` is the player the alert is about (shooter, robber): systems that describe the suspect (vehicle, plate, gender) read that player's client. `jobs` default to the alert system's police jobs (ai-policealert: its panel's alert jobs; others: `police`).
- QB / Qbox scripts' `police:server:policeAlert` (clients `TriggerServerEvent(name, text)`, server scripts `TriggerEvent(name, text, camId, playerSource)`, the qb-policejob contract used by qb/qbx robberies, vehicle keys and more) is answered by ai-core and goes to the active system at the player's position, unless that system answers the event itself (`answersPoliceAlert`). Client emits are rate limited (1 per 10 s) and need a loaded character.
- Test: `aicore_alert [high]` (ai-core admins) sends a test alert at the caller's position (Legion Square from the console) through the active system.

## Systems

| System | Call | Status |
|---|---|---|
| tgiann-policealert | with `source`: server export `Alert(source, { jobs, label, code, icon, coords, duration, bgAnimate, blip, custom })` (the suspect's client adds street, zone, vehicle, gender, then the alert goes through its own spam check); without: `SendCustomAlert({ label, code, icon, coords, duration, bgAnimate, blip, sound, information = { custom } }, jobs)`. `message` becomes a custom info row, `priority: "high"` the blinking background, `blip.sprite` its blip (it picks the colour). It answers `police:server:policeAlert` itself. | written from its 2.10 source, untested on ai-core |
| ai-policealert (default, last in the order) | export `DispatchAlert(alert)`: built-in alert cards (below) | tested in the browser preview; in game untested |

tgiann-policealert sends its own shot alerts (`config.shotFireAlert`): turn off one of them (ai-police panel "Shot alerts" or its config), or shots alert twice.

### ai-policealert alert cards

On-duty members of the alert's jobs get a card on the right (code, title, number, clock time, street and zone read on their own client, message, the waypoint key on the newest card, a draining time bar; `high` blinks red), a blip (`blip` or a red pulse, flashing when high) and the waypoint key (keybind `police_alert_waypoint`, default J, newest live alert). Snapshot of the job's live alerts when going on duty (an empty one clears the cards when going off duty), then each new alert as a delta; expiry runs on the client clock (its own panel: default alert jobs, alert time for blip and key, card time, sound).

## Not supported yet

Other alert systems need one adapter file each; their APIs below come from their public docs and other bridges, not from a source we read, so check them against the script before writing the adapter.

| System | What its API looks like |
|---|---|
| ps-dispatch | client exports per alert type (`exports['ps-dispatch']:CustomAlert({ message, codeName, code, icon, priority, coords, ... })`) and server event `ps-dispatch:server:notify` with the built alert |
| cd_dispatch | server event `cd_dispatch:AddNotification({ job_table, coords, title, message, flash, unique_id, sound, blip = { sprite, scale, colour, flashes, text, time, radius } })` |
| qs-dispatch, rcore_dispatch, lb-tablet, core_dispatch, linden_outlawalert | each its own export or event |

Scripts that call those systems directly (instead of the QB event) need that system installed; ai-policealert does not stand in for their APIs.

## Adding an alert system

1. A file in `server/dispatch/adapters/` exporting a `DispatchAdapter` (`@aicore-fivem/shared` `dispatch.ts`), calling the system with lib `callExport`; `answersPoliceAlert: true` when the system answers `police:server:policeAlert` itself.
2. Add it to `DISPATCH_SYSTEMS` in `registry.ts`, before `aiPolice`.
3. Build ai-core; the panel lists the new system.
