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
| ps-dispatch 2.2.2 | server event `ps-dispatch:server:notify({ message, codeName = "NONE", code, icon = "fas fa-<icon>", priority = 1 \| 2, coords, alertTime, jobs, alert = { sprite, color, scale, length, sound, sound2, flash } })`; `message` is joined to the title, jobs default `leo` (its job type), blip and sound defaults are its `CustomAlert`'s | written from its 2.2.2 source, untested on ai-core |
| cd_dispatch | client event `cd_dispatch:AddNotification` to `-1` (its documented server-side call) with `{ job_table, coords, title = "<code> - <title>", message, flash, unique_id, sound, blip = { sprite, scale, colour, flashes, text, time (minutes), radius } }` | written from its docs (docs.codesign.pro/paid-scripts/dispatch) |
| rcore_dispatch | server event `rcore_dispatch:server:sendAlert({ code, default_priority = high \| medium, coords, job, text = "<title> - <message>", type = "alerts", blip_time (seconds), blip })` | written from its docs (documentation.rcore.cz, rcore_dispatch "Add alerts") |
| core_dispatch | server export `addCall(code, title, { { icon, info = message } }, coords, jobs, cooldown ms, sprite, color, priority)` | written from its docs (docs.c8re.store/core-dispatch/exports) |
| linden_outlawalert 2.7.1 (ESX, archived) | server event `wf-alerts:svNotify({ coords, dispatchData = { displayCode, description = title, isImportant, recipientList, length (ms), infoM, info = message, blipSprite, blipColour, blipScale } })` | written from its 2.7.1 source, untested on ai-core |
| lb-tablet (MDT dispatch) | server export `AddDispatch({ priority, code, title, description, location = { label, coords = { x, y } }, time (seconds, default 300), job, blip = { sprite, color, size, label } })` | written from its docs (docs.lbscripts.com/tablet server exports) |
| wasabi_mdt (MDT dispatch) | server export `CreateDispatch({ title, description, code, coords, priority = 5 \| 1 })`; the MDT decides who sees it (no jobs, blip, duration) | written from its docs (docs.wasabiscripts.com, wasabi_mdt exports) |
| ai-policealert (default, last in the order) | export `DispatchAlert(alert)`: built-in alert cards (below) | tested in the browser preview; in game untested |

tgiann-policealert's prime hours (`IsPrimeTime`) feed ai-core's prime time salary: `prime-time.md`.

tgiann-policealert sends its own shot alerts (`config.shotFireAlert`): turn off one of them (ai-police panel "Shot alerts" or its config), or shots alert twice.

### ai-policealert alert cards

On-duty members of the alert's jobs get a card on the right (code, title, number, clock time, street and zone read on their own client, message, the waypoint key on the newest card, a draining time bar; `high` blinks red), a blip (`blip` or a red pulse, flashing when high) and the waypoint key (keybind `police_alert_waypoint`, default J, newest live alert). Snapshot of the job's live alerts when going on duty (an empty one clears the cards when going off duty), then each new alert as a delta; expiry runs on the client clock (its own panel: default alert jobs, alert time for blip and key, card time, sound).

Limits of the third-party systems:

- Coordinates go to Lua as a table `{ x, y, z }` (a JS export call or event cannot build a Lua `vector3`). The docs of cd_dispatch, rcore_dispatch and core_dispatch show `vector3` values; `.x / .y / .z` reads work on a table, vector maths in their code would not. Untested on each.
- ps-dispatch, cd_dispatch and linden_outlawalert send every alert to every client (`-1`) and filter on the client: their own design, the adapter calls their documented entry.
- ps-dispatch 3.0.0 rate limits `ps-dispatch:server:notify` per event source (`src <= 0` on the source); a server-side emit has no player source and was not checked against it. The adapter is written for 2.2.2 and warns on another version.
- None of them is known to answer `police:server:policeAlert` itself, so ai-core keeps answering it for them.
- Docs-only adapters carry no `version` (their docs state none).

## Not supported yet

Found, not added (API not verified, or it does not fit):

| System | Why |
|---|---|
| qs-dispatch | its docs (quasar-store.com/docs/dispatch-and-mdt) require `callLocation` to be a `vector3`, "not a table": a call from ai-core (JS) can only send a table |
| origen_police | official docs unreachable (docs.origennetwork.store does not resolve); bridges call `exports.origen_police:SendAlert({ coords, title, type = "GENERAL", message, job })` |
| kartik-mdt | no docs found; bridges send `kartik-mdt:server:sendDispatchNotification({ title, code, description, x, y, z, blip, jobs = { police = true } })` |
| tk_dispatch, codem-dispatch, aty_dispatch | only seen in bridges (`tk_dispatch:addCall`, `codem-dispatch:CustomDispatch`, `aty_dispatch:server:customDispatch`), docs not read |
| redutzu-mdt, emergencydispatch | no public API found |
| tgiann-mdt, tgiann-policejob | no alert API of their own (tgiann-policejob sends its alerts through tgiann-policealert's `Alert`) |

Scripts that call those systems directly (instead of the QB event) need that system installed; ai-policealert does not stand in for their APIs.

## Adding an alert system

1. A file in `server/dispatch/adapters/` exporting a `DispatchAdapter` (`@aicore-fivem/shared` `dispatch.ts`), calling the system with lib `callExport`; `answersPoliceAlert: true` when the system answers `police:server:policeAlert` itself.
2. Add it to `DISPATCH_SYSTEMS` in `registry.ts`, after the other dispatch scripts and before the MDTs and `aiPoliceAlert`.
3. Build ai-core; the panel lists the new system.
