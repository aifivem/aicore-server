# Fuel layer (fuel scripts)

A vehicle's fuel (0-100) goes through ai-core, so scripts never read a fuel script's bag, decorator or exports and any of the supported ones can run.

- Server: lib `fuel.get(vehicle)`, `fuel.set(vehicle, level)`, `fuel.provider()` (exports `GetVehicleFuel`, `SetVehicleFuel`, `GetFuelSystem`; `resources/[ai]/ai-core/resource/server/fuel/`). Lib `spawnVehicle({ fuel })` sets through it. Panel setting `fuel` (`auto` = the first running script of `FUEL_SYSTEMS`); the pick is published as GlobalState `ai:fuel`. Without a fuel script the `fuel` bag is read and written as it is.
- Client: lib `fuel.get(vehicle)` reads the `fuel` bag (a memory read; the game's tank level without one). The server keeps that bag for every script: scripts that keep fuel on the server write it themselves, for client-side scripts ai-core mirrors it.
- Client-side scripts (`mirrored`, `resource/client/fuel/`): the driver's client reports the script's level at every whole percent (`ai-core:fuelReport`, checked 1/s while driving, taken within 30 m of the vehicle) into the `fuel` bag; a server set writes the bag and the pending bag `ai:fuelSet`, and the entity's owner client puts it into the script (when the bag changes, and each second while it drives), then reports it back, which clears the pending bag.

| Script | Read | Set | Status |
|---|---|---|---|
| ai-fuel | `fuel` bag | `fuel` bag | ours |
| ox_fuel 1.5.4 | `fuel` bag | `fuel` bag (its server's own way) | written from its source |
| Renewed-Fuel | `fuel` bag | server export `SetFuel(vehicle, amount)` | written from its docs |
| codem-xfuelv2 (Codem xFuel V2) | `fuel` bag | server export `SetFuel(vehicle, level)` | written from its docs |
| LegacyFuel 1.3 | client export `GetFuel(vehicle)` (decorator) | client export `SetFuel(vehicle, level)` | written from its source |
| cdn-fuel 2.1.9 | client `GetFuel` | client `SetFuel` | written from its source |
| ps-fuel 1.0.2 | client `GetFuel` | client `SetFuel` | written from its source |
| lc_fuel 1.2.4 | client `GetFuel` | client `SetFuel` | written from its source |
| okokGasStation | client `GetFuel` | client `SetFuel` | written from its docs |
| x-fuel (Codem xFuel) | client `GetFuel` | client `SetFuel` | written from its docs |
| qs-fuelstations | client `GetFuel` | client `SetFuel` | written from its docs |

A new fuel script: a server adapter (`FuelAdapter`; `bagFuel` for a server bag script) or one line in `CLIENT_FUEL_SYSTEMS` plus its client adapter (`FuelClientAdapter`, usually `exportFuel`), in the order it should win. Every third-party script of the list makes ai-fuel unneeded (`connection/conflicts.ts`).

## Limits

- ox_fuel's driver client writes the `fuel` bag with replication, which `sv_stateBagStrictMode` refuses: on ai-core its burn does not reach the server. Untested on ai-core.
- Client-side scripts: the server's level is the last report (up to a whole percent and a second behind while driving). A refuel done on foot by a player who is not the driver reaches the server only when someone drives the vehicle; a vehicle parked right after such a refuel stores the older level.
- A pending set waits until a client owns the entity (nobody near: until someone drives it); a client-side script that gives a fresh vehicle a random level (LegacyFuel) is overruled once the owner applies it.
- codem-xfuelv2 `provide`s LegacyFuel and lc_fuel answers LegacyFuel's exports: keep only one fuel script.
- x-fuel's client `GetFuel` may answer `level, fuelType`: the first value is taken.
