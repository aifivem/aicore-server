# Stress layer

Scripts that stress or calm a player (a robbery, shooting, a drug sale, a joint) go through ai-core on the server: lib `stress.gain(source, amount)` / `stress.relieve(source, amount)` (export `AddStress(source, amount)`: a negative amount relieves; false when no HUD keeps stress), `stress.provider()` (export `GetStressSystem`); Lua `aiLib.stress`. Stress is 0-100 as QB keeps it (character metadata `stress`). ai-core forwards to the first running HUD of `resources/[ai]/ai-core/resource/server/stress/registry.ts`.

| HUD | Gain / relieve | Status |
|---|---|---|
| tgiann-lumihud 2.2.1, tgiann-hudv2, tgiann-modern-hud | QB's `hud:server:GainStress` / `RelieveStress (amount)` from the player's client | written from their source (server/qb/qbserver.lua) |
| qb-hud 2.2.0 | the same events | written from its source (server.lua) |
| ps-hud 2.1.2 | the same events | written from its source (server.lua) |
| ai-hud | server export `AddNeed(source, "stress", amount)` | ours, last in the order |

QB's events take the player from the event's source, so ai-core sends `CORE.stressRelayEvent (amount)` to that player and ai-core's client sends the HUD's event (`resource/client/stress.ts`); the HUD applies its own rules (the TGIANN HUDs skip police with their `config.DisablePoliceStress` and send a QB notification).

Limits: the TGIANN HUDs answer these events only with tgiann-core's `config.framework = "qb"` and their `config.stressActive`; on ai-core tgiann-core may pick its ESX part, and then stress changes do nothing. Not added: codem HUDs and 0r-hud (no stress export or event found in a source or docs). No ai-* script changes stress by hand yet besides ai-hud's own sources (speed, shots).
