# MDT layer (police records)

Fines, warrants, arrests and jail records go into the police MDT through ai-core, and its screen opens through ai-core, so scripts never call an MDT directly. There is no ai-* MDT: with none running nothing is written and nothing opens.

- Server: lib `mdt.record({ kind: "fine" | "warrant" | "arrest" | "jail", target, by?, title, amount?, minutes? })`, `provider()` (exports `AddMdtRecord`, `GetMdtSystem`; `resources/[ai]/ai-core/resource/server/mdt/`). Lua `aiLib.mdt.record`.
- Client: lib `mdt.open()` (client export `OpenMdt`; `resource/client/mdt/`), following the server's pick (GlobalState `ai:mdt`). The MDT checks the player's job itself.
- Picked by the panel setting `mdt` (General, Police records): `auto` = the first running MDT of `MDT_SYSTEMS`.
- Writers: ai-police (fine and arrest records), ai-prison (a jail record on every jailing).

| Script | Records | Open | Status |
|---|---|---|---|
| tgiann-mdt | none: no exports, and its record events look citizens up in the framework's `users` / `players` tables, which ai-core does not have | client event `tgiann-mdt:open` | written from its source |
| lb-tablet | `jail`: `LogMDTJailed("police", citizenid, officerCitizenid, title, minutes * 60)` | the tablet item (no export) | written from its docs |
| ps-mdt 3.1.4 | none (no server record exports) | client export `OpenMDT()` | written from its source |
| wasabi_mdt | none (only warrant link exports) | client export `OpenMDT()` | written from its docs |

Limits:
- lb-tablet reports (`CreateMDTReport`) need a tab id each server sets up, so fines, warrants and arrests are not written there.
- Not supported: redutzu-mdt, kartik-mdt, origen_police (no export documentation found).
