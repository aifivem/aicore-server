# Door lock layer (door lock scripts)

Scripts lock and unlock doors through ai-core, so they never call a door lock script and any of the supported ones can run. A door is named by the active script's own id (ai-doorlock's panel id, tgiann-doorlock's key, ox_doorlock's id or name...): a script that stores door ids (ai-robberies' door targets) stores the id of the door lock script the server runs.

- Server: lib `doors.setLocked(id, locked, by?)`, `doors.isLocked(id)` (null = unknown), `doors.provider()` (exports `SetDoorLocked`, `IsDoorLocked`, `GetDoorlockSystem`; `resources/[ai]/ai-core/resource/server/doorlock/`). Panel setting `doorlock` (`auto` = the first running script of `DOORLOCK_SYSTEMS`). `by` is the player acting: scripts without a server API need a player's session to carry the change (any player with a character when it is left out).

| Script | Set | Read | Status |
|---|---|---|---|
| ai-doorlock | export `SetDoorState(id, locked)` | export `IsLocked(id)` | ours |
| tgiann-doorlock 3.2.2 | export `SetDoorLocked(key, locked)` (false for an unknown door) | export `GetDoorLocked(key)` | written from its source |
| ox_doorlock 1.23.0 | export `setDoorState(id, 1 / 0)`; a text id is looked up with `getDoorFromName` | `getDoor(id).state` | written from its source |
| qb-doorlock 2.0.0 | server event `qb-doorlock:server:updateState` with `unlockAnyway` and a loaded player as `sentSource` | none | written from its source |
| cd_doorlock | client event `cd_doorlock:SetDoorState_uniqueid (state, uniqueId)` to one player | none (client exports only) | written from its docs |
| rcore_doorlock | export `changeDoorState(doorId, 1 / 0)` | none | written from its docs |

A new door lock script: one adapter file (`DoorlockAdapter`) and one line in `DOORLOCK_SYSTEMS`. Every third-party script of the list makes ai-doorlock unneeded (`connection/conflicts.ts`).

## Limits

- qb-doorlock and cd_doorlock need an online player with a character to carry a change; with nobody on the server the call does nothing.
- qb-doorlock, cd_doorlock and rcore_doorlock cannot tell a door's state on the server: `isLocked` answers null.
- ox_doorlock: a door whose name is all digits is taken as an id.
- nui_doorlock is not supported: its only state change is a net event from an authorised player (no script API).
- ai-doorlock answers ox_doorlock's `setDoorState` / `getDoor` without `provide`ing ox_doorlock; never run both (the conflict rule refuses joins).
