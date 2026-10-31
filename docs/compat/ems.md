# EMS layer (free medics, distress calls)

How many medics are free and distress calls of downed players go through ai-core. ai-core knows duty itself (lib `online`, its duty counts); the layer adds EMS scripts that know more (busy medics) or keep their own distress list.

- Server: lib `ems.available(jobs)`, `ems.distress(source, { jobs, message? })`, `provider()` (exports `GetAvailableMedics`, `SendDistress`, `GetEmsSystem`; `resources/[ai]/ai-core/resource/server/ems/`). Lua `aiLib.ems`.
- Picked by the panel setting `ems` (General, Medics): `auto` = the first running script of `EMS_SCRIPTS`, then ai-core's own part (`ai-core`). What the active script does not answer, ai-core answers: on-duty members of the jobs from its duty counts, the distress call as a `10-52` alert to the jobs through the dispatch layer.
- Users: ai-death's check-in treatment (works only while at most `treatMaxEms` medics are free), its down screen (free medics shown once, the "Call a doctor" key sends `distress`).

| Script | Free medics | Distress | Status |
|---|---|---|---|
| tgiann-policealert 2.10.0 | `GetAvailablePersonalCount(jobs)` (on duty, not Code 7) | through the dispatch layer (tgiann-policealert itself when it is the alert system) | written from its source |
| wasabi_ambulance_v2 | ai-core's duty counts | `addToDistress(source)` (its dispatch set to `"internal"`) | written from its docs |

Limits:
- tgiann-policealert counts only its `config.empoloyeeListJobs` (police and ambulance by default): another EMS job counts 0.
- Not supported: brutal_ambulancejob's `getAvailableDoctorsCount` is a client export (the server cannot ask it), ak47 ambulance scripts (no export documentation found).
