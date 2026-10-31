# Seat belt layer

Scripts that need to know whether the local player wears a seat belt (a HUD's belt icon, a crash) ask ai-core on the player's client: lib `seatbelt.isOn()` (export `GetSeatbelt`: true / false, null when no seat belt script answers), `seatbelt.onChange(fn)` (local event `CORE.clientSeatbeltEvent (worn)`, only from scripts that tell changes), `seatbelt.provider()` (export `GetSeatbeltProvider`); Lua `aiLib.seatbelt`. ai-core reads the first running script of its list (`resources/[ai]/ai-core/resource/client/seatbelt.ts`); `isOn` calls the script on demand, so read it on an action or a vehicle change, never per frame.

| Script | Read | Changes | Status |
|---|---|---|---|
| tgiann-lumihud 2.2.1 | export `Seatbelt()` (any belt or harness on) | none | written from its source (client/editable.lua) |
| tgiann-hudv2 | export `seatbelt()` | none | written from its source |
| tgiann-modern-hud | export `seatbelt()` | none | written from its source |
| qbx_seatbelt 1.0.0 | local player state `seatbelt` | the same state (lib `PlayerState`) | written from its source (client/main.lua) |
| ai-smallresources | export `GetSeatbelt()` (null while its seat belts are off or not in a car with one) | local event `SEATBELT_EVENT` | ours, last in the order |

Limits: TGIANN HUDs tell no changes, so `onChange` stays quiet while one is picked (ai-hud reads `isOn` when a vehicle is entered). qbx_seatbelt writes its state bag on its own client; under ai-core's `sv_stateBagStrictMode` the write does not replicate, which is fine for reading the local player. Not added: jg-hud (no seat belt read export: it takes a third-party belt through its own config hook), 0r-hud (no export found in a source or docs).

A new seat belt script: one line in `ADAPTERS` (resource, version, `worn()`, optional `watch(changed)`), in the order it should win.
