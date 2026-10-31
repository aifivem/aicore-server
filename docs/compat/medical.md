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

A new death script: one server adapter (`MedicalAdapter`) and one client adapter (`MedicalClientAdapter`, usually a state bag key through `stateAdapter`), each one line in its list, in the order it should win.
