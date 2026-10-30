# Game and engine events

Use an event the engine already sends before writing a poll. Sources: docs.fivem.net "Game events", "Net game events", "Client events", "Server events", "OneSync".

## Client

- `gameEventTriggered (name: string, args: number[])`: the game's script events. Useful ones:
  - `CEventNetworkPlayerEnteredVehicle`: `[playerIndex, vehicle]`, any player (filter `args[0] === PlayerId()`). There is no exit, seat-change or weapon-switch event: read those while in a vehicle (ai-core's cache watcher does, lib `cache` / `onCache`).
  - `CEventNetworkEntityDamage`: `[victim, attacker, ..., weaponHash, ..., isFatal, ...]`: hits and deaths of any entity near the player (the index layout differs between game builds; read the docs page before relying on an index).
- `entityDamaged (victim, culprit, weapon, baseDamage)`: CFX's own damage event on the client, simpler than the game event.
- `populationPedCreating (x, y, z, model, setters)`: cancel or change ambient peds as they spawn (`CancelEvent()`).
- `onClientResourceStart` / `onClientResourceStop (resource)`: re-register with a resource that restarted (target, inventory).

## Server

- `entityCreating (entity)` (cancelable with `CancelEvent`), `entityCreated (entity)`, `entityRemoved (entity)`: every networked entity under OneSync; check `GetEntityPopulationType` to tell script entities from ambient ones.
- `weaponDamageEvent (sender, data)`, `startProjectileEvent`, `ptFxEvent`, `explosionEvent`: client-reported game events, cancelable; the base for anti-cheat checks.
- `onPedDeath`: FXServer 38039+ death of a player ped; ai-core turns it into `CORE.playerDiedEvent (src, killer, weaponHash)`.
- `playerJoining (oldId)`, `playerDropped (reason)`, `playerConnecting` (deferrals: ai-core's connection gate, `AddConnectionCheck`).
- `playerEnteredScope` / `playerLeftScope ({ for, player })`: the OneSync docs warn the cost grows with the players in scope; only ai-core listens (`resource/server/scopes.ts`), resources call lib `playersNear` / `playersNearEntity` (export `GetPlayersInScope`).

## OneSync facts

- Culling radius ~424 m by default: a player only knows entities and players inside it; server natives see everything.
- Up to 2048 players with OneSync infinity; state bags replicate only to players with the entity in scope.
- Prefer entity state bags over events for per-entity data: they reach exactly the players who can see the entity.
- Hiding players in an interior: `NetworkConcealPlayer` / `NetworkConcealEntity` on the clients, not routing buckets (buckets cut voice, sync and every other system).

## Game features worth using (FiveM natives)

- Fuel: `SetFuelConsumptionState(true)` turns on the game's own consumption (off by default): per tick `time step x rpm x fPetrolConsumptionRate (handling, default 0.5) x SetFuelConsumptionRateMultiplier (default 1)`; no burn with the engine off, for NPC-only vehicles, bicycles or a 0 `fPetrolTankVolume`. Read / write the tank in litres with `GetVehicleFuelLevel` / `SetVehicleFuelLevel`; per vehicle rates with `SetVehicleHandlingFloat(vehicle, "CHandlingData", "fPetrolConsumptionRate", x)`. A 65 l tank lasts about 2.5 h at max rpm at multiplier 1.
- Weather cycles: `SetWeatherCycleEntry(index, type, timeMult)` + `ApplyWeatherCycles(count, msPerCycle)` make the client's own repeating weather sequence (local, not synced).
- Snow: `SetVehicleXmasSnowFactor(vehicle, grip)` / `GetVehicleXmasSnowFactor` (wheel grip loss in xmas weather, default 0.2, 0 = no effect, higher = slipperier), `ForceSnowPass(true)` for snow on the ground.
