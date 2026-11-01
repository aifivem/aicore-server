# Medical layer (death and ambulance scripts)

Revive, heal and "is the player down" go through ai-core, so admin tools and scripts never call a death script directly and any of the supported ones can run.

- Server: lib `medical.revive(source)`, `heal(source)`, `isDead(source)`, `provider()` (exports `RevivePlayer`, `HealPlayer`, `IsPlayerDead`, `GetMedicalSystem`; `resources/[ai]/ai-core/resource/server/medical/`). The first running script in `MEDICAL_SYSTEMS` answers; the pick is published as GlobalState `ai:medical`.
- Client: lib `medical.isDead()` / `medical.onChange(fn)` (client export `IsDead`, local event `ai-core:client:dead`; `resource/client/medical/`). The client half follows the server's pick and reads that script's own marker. Death scripts keep a downed ped alive to animate it, so client code never decides "down" with `IsEntityDead` alone.

| Script | Down marker | Revive / heal | Status |
|---|---|---|---|
| ai-death | player state `dead` | `Revive` / `Heal` exports | ours |
| qbx_medical | player state `qbx_medical:deathState` (2 last stand, 3 dead) | `Revive` / `Heal` exports | written from its source |
| ars_ambulancejob | player state `dead` | client event `ars_ambulancejob:healPlayer` (`{ revive }` / `{ heal }`) | written from its source |
| qb-ambulancejob | QB metadata `isdead` / `inlaststand` | client events `hospital:client:Revive` / `hospital:client:HealInjuries` (`full`) | written from its source |
| esx_ambulancejob | ESX player state `isDead` | client events `esx_ambulancejob:revive` / `esx_ambulancejob:heal` (`big`) | written from ESX core's state; the events are esx_ambulancejob's long-standing names |
| tgiann-ambulance | player state `isDead` (its server sets it, down or dead) | export `SetPlayerAlive(source, { isAdmin = true, healBodyDamage = true })` (its `/revive` call); heal = the same call on a player who is up (health 200, body damage cleared) | written from its source (no `version` in its fxmanifest) |
| wasabi_ambulance_v2 | player state `wasabi:deathState` (1 last stand, 2 dead) | exports `RevivePlayer(id)` / `ApplyHeal(id, { health = 200, injuries = "all", limbHealth = 100 })` | written from its docs |
| wasabi_ambulance (v1) | player state `dead` (`"dead"` / `"laststand"`) | export `RevivePlayer(id)`; no server heal | written from its docs |
| osp_ambulance 2.0.5 | player state `BodyDamage` (`isDead` / `inLastStand`) or `isDead`; client export `isDead()` + events `osp_ambulance:OnPlayerDead` / `OnPlayerSpawn` | client event `hospital:client:Revive (true)` for both (on a player who is up it restores health) | written from its open files |
| brutal_ambulancejob 1.3.1 | QB metadata `isdead`; client export `IsDead()` + events `brutal_ambulancejob:client:onPlayerDeath` / `brutal_ambulancejob:revive` | client event `brutal_ambulancejob:revive`; no heal | written from its docs and open files |

A new death script: one server adapter (`MedicalAdapter`) and one client adapter (`MedicalClientAdapter`, usually a state bag key through `stateAdapter`), each one line in its list, in the order it should win.

## Limits

- tgiann-ambulance and esx_ambulancejob share the `isDead` key; whichever runs is picked by its resource name.
- wasabi_ambulance_v2: the state key is its config default; an owner who renames it must rename it back. A v2 copy installed in a folder named `wasabi_ambulance` is taken for v1 (wrong state key): keep its folder name.
- wasabi_ambulance (v1) and brutal_ambulancejob have no server heal call: `heal` does nothing with them.
- brutal_ambulancejob in ESX mode (`Config.Core = "ESX"`) keeps no down marker the server can read: server `isDead` answers false (the client half still works through its export). Its revive event is documented as a client trigger; servers call it with `TriggerClientEvent` (other scripts' integrations).
- osp_ambulance and brutal_ambulancejob: the client half reads their export one tick after their down / up events (they fire the event before storing the state).
- osp_ambulance's `BodyDamage` state is set by its escrowed code; if its client writes it, ai-core's `sv_stateBagStrictMode` drops the write and only the `isDead` state (set by its server when `Config.MutePlayerOnDeath` / `MutePlayerOnLastStand` is on) marks a downed player on the server. Untested on ai-core.
- ai-death next to another death script is not a built-in conflict rule (`connection/rules.ts` builds rules from the inventory and key registries only).

