# MDT layer (police records)

Fines, warrants, arrests and jail records go into the police MDT through ai-core, warrant checks ask it and / or ai-core's own warrants, and its screen opens through ai-core, so scripts never call an MDT directly. There is no ai-* MDT: with none running nothing is written and nothing opens, and warrant checks answer from ai-core's own warrants.

- Server: lib `mdt.record({ kind: "fine" | "warrant" | "arrest" | "jail", target, by?, title, amount?, minutes? })`, `hasWarrant(source | citizenid)` (promise of a boolean: false = no warrant, no MDT, or an MDT without a warrant query), `provider()` (exports `AddMdtRecord`, `HasMdtWarrant(target, done)` (a callback), `GetMdtSystem`; `resources/[ai]/ai-core/resource/server/mdt/`). Lua `aiLib.mdt.record`, `aiLib.mdt.hasWarrant` (waits).
- ai-core's own warrants (`resources/[ai]/ai-core/resource/server/warrants/`, table `ai_core_warrants`): issued and cleared by admins (Warrants card on a character's Players page), on-duty officers (ai-police job menu, Warrants) and scripts (lib `warrants`: `add({ target, reason, minutes?, by? })`, `clear(id, by?)`, `clearAll(target, by?)`, `of(target)`, `page(cursor?)`; exports `AddWarrant`, `ClearWarrant`, `ClearWarrants`, `GetWarrants`, `ListWarrants`). A new one of an online target is also written into the active MDT as a `warrant` record when the MDT takes them.
- Which warrants count: panel setting `warrants` (General, Police records card): `auto` (default) = the active MDT's while it has a warrant query (table below), else ai-core's own (no MDT, or lb-tablet / wasabi_mdt); `both` = either; `mdt` = only the MDT's (nobody is wanted without one).
- Warrant answers are kept 30 s per citizenid (`mdt/warrants.ts`; dropped on an MDT switch): a warrant issued in the MDT counts within 30 s. ai-core's own warrants answer from memory for a loaded character and forget a stored one's answer on every change, so they count at once. A failed read (missing table, export error) is logged and answers false.
- Client: lib `mdt.open()` (client export `OpenMdt`; `resource/client/mdt/`), following the server's pick (GlobalState `ai:mdt`). The MDT checks the player's job itself.
- Picked by the panel setting `mdt` (General, Police records): `auto` = the first running MDT of `MDT_SYSTEMS`.
- Writers: ai-police (fine and arrest records), ai-prison (a jail record on every jailing). Warrant checks: ai-police's wanted sightings (and through ai-core's bridge `qbx_smallresources` `SendWantedAlert`: tgiann-bank, tgiann-clothing, tgiann-realparking, lc_stores, codem-phone).

| Script | Records | Warrant check | Open | Status |
|---|---|---|---|---|
| tgiann-mdt | none: no exports, and its record events look citizens up in the framework's `users` / `players` tables, which ai-core does not have | reads its wanted list read only: a row in `tgiann_mdt_arananlar` with the citizenid (sql.sql; its wanted screen lists every row, removing a warrant deletes the row) | client event `tgiann-mdt:open` | written from its source |
| lb-tablet | `jail`: `LogMDTJailed("police", citizenid, officerCitizenid, title, minutes * 60)` | none: no warrant export documented (`GetMDTUser` documents no fields) and no schema at hand: false | the tablet item (no export) | written from its docs |
| ps-mdt 3.1.4 | none (no server record exports) | reads its warrants read only: a row of `mdt_reports_warrants` with the citizenid and `expirydate >= NOW()`, the test of its own active list (server/backend/warrants.lua; closing sets `expirydate` to now) | client export `OpenMDT()` | written from its source |
| wasabi_mdt | none (only entity link exports) | none: `GetActiveWarrants()` lists every active warrant but its docs give no field names, so the citizen cannot be matched: false | client export `OpenMDT()` | written from its docs (docs.wasabiscripts.com/advanced-series/wasabi-mdt/exports) |
| codem-mdtv2 1.3 | none (escrowed, no record exports) | server export `hasWarrant(citizenid)` (escrowed: confirmed by the scripts that call it, the owner's qbx_smallresources isWanted); a Promise answer is awaited, Lua truth (anything but nil / false) is a warrant | none known: `mdt.open()` answers false | written from its callers |

Limits:
- lb-tablet reports (`CreateMDTReport`) need a tab id each server sets up, so fines, warrants and arrests are not written there.
- tgiann-mdt's warrant timer runs from the framework `users.aranma` column, which ai-core does not have: a warrant stays until an officer removes it.
- Not supported: redutzu-mdt, kartik-mdt, origen_police (no export documentation found).
