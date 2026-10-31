# TypeScript/JavaScript in FiveM: what to do and how

## 1. Runtime limits

- **[official]** Client JS has no browser or Node APIs: packages that use DOM, `localStorage`, `fetch`, `fs` or `Buffer` never go into a client bundle.
- **[official]** The server runs a customized Node 16 by default; `node_version '22'` in fxmanifest enables Node 22. Every resource of ours uses 22 (the fivem-ts postBuild writes it).
- **[official]** Thread affinity: callbacks fired by Node (fs, http, net, Node timers) run on the libuv thread; calling a server native there fails with "No current resource manager". Return to the game thread with `setImmediate(() => ...)` before the native. Do not reschedule callbacks that call no native.
- **[official]** Natives are global functions with the same PascalCase names as in Lua. Types come from `@citizenfx/client` / `@citizenfx/server`.
- **[experience]** The bundler shadows the name `exports`: no bare `exports` in source, no value `export` from an entry file (the script shows "Started" but never loads). The server bundle needs the `exports = globalThis.exports;` banner.

## 2. Timer and tick cost

- **[measured]** An empty JS `setTick`, or a 1 s `setInterval`, raises a resource to ~0.05 ms in resmon; a Lua thread with `Wait(1000)` shows 0.00 ms. Cfx's explanation in GitHub issue #1653: the JS scheduler lacks Lua's "bookmark" scheduling and the V8 C++ API costs more than the Lua C API; "50 microseconds is still very much negligible and this won't go up much more with actual code" (2022; lower numbers were reported in 2024).
- **[claim]** The overhead of many JS resources is not noticeable; the cost comes from timers (Cfx forum, 2024).
- Resulting rules:
  - Every tick handler and every timer carries a fixed per-frame cost (a runtime crossing and the scheduler walk), whatever its interval: ten `setInterval`s cost ten times one. So a resource has one scheduler (lib `every(ms, fn)`, Lua `aiLib.every`) owning a single `setTick`, and every periodic job registers there at the interval it needs (0 = every frame; only drawing and control reads need that). The tick is removed while no job is active (no idle tick) and added back on the next `set(true)`.
  - Inside the tick, jobs of one interval share a queue ordered by due time: a frame with nothing due costs one `GetGameTimer` and one comparison, a due frame touches only the due jobs; each job keeps its own phase (first run one interval after it was switched on) so a check that must not run at once (a sit watch) behaves like `setInterval`. Measured with natives stubbed (`packages/lib/bench/scheduler.bench.ts`): 10 / 100 / 1000 jobs at mixed intervals cost 0.4 / 0.8 / 1.6 µs of JS a frame against 0.3 / 1.6 / 14.6 µs for the same jobs as separate timers, before the per-handler runtime cost the separate timers add in the game; a frame with nothing due 0.02 µs.
  - Lua threads sleep for free ("bookmark" scheduling), so the Lua scheduler is one thread that `Wait`s until the next due job and ends when none is active; a job that becomes due sooner starts a new thread and the sleeping one ends when it wakes. A Lua job never `Wait`s (it would hold every other job).
  - No object/array allocation inside a tick (GC pressure); unchanged results are not recomputed.
  - Target: idle resmon below 0.10 ms **[claim, widely accepted]**; nothing counts as "optimized" without a measurement.

## 3. Events

- **[official]** `emitNet` (TriggerClientEvent/TriggerServerEvent) is for small payloads. A few KB and above go through `TriggerLatentClientEvent` / `TriggerLatentServerEvent`; a normal event with large data blocks the network channel, and if that lasts too long the client times out.
- **[official]** The latent `bps` argument is bytes per second per target; `0`/`-1` means the default 25000. Sent to `-1`, the total is `bps × player count`. Very large `bps` (~10,000,000) causes connectivity problems.
- **[experience]** Event, export and state bag arguments go through msgpack; data deeper than 16 levels silently turns into `nil`. Deep data (an admin schema) travels as a JSON string and is decoded at the last stop.
- **[experience]** MessagePack can turn a missing field into `null`: check `!= null` at the boundary and normalize with `?? undefined`.
- **[source]** On a client, a normal server event arrives with source `net:65535`, a latent one with `net:0`: the client registers the server as event reassembly target 0 (`ResourceNetBindings.cpp` `RegisterTarget(0, 0xFF)`, `EventReassemblyComponent.cpp` `"net:" + std::to_string(source)`), so JS `source` is `0`. A local emit carries a string source. "From the server" is `typeof source === "number"` (lib `fromServer`), never a truthiness test, or every latent event is dropped. Lua: `source ~= nil and source ~= ''`.
- Every client event is validated (type, range, ownership, distance) and rate limited. Money, item and permission decisions are never made on the client.

## 4. Calls between resources (exports, local events)

- **[claim + measured]** Exports and cross-resource events copy data by value (serialization); functions pass by reference. One test measured send times spiraling above ~100 kB/s of cross-resource data and server hitches at ~1 MB/s (2020, local PC).
- Resulting rules:
  - An export never returns a whole object (like ESX `xPlayer`); it returns the small value the caller needs.
  - Hot paths (ticks, frequent events) never call another resource's export. The calling resource keeps the data it needs in its own memory and updates it from core's delta events.
  - Exports stay synchronous; no promise crosses a resource boundary (unreliable). Async work uses callbacks/events.
  - Static data (vehicle list, item definitions) is never distributed through exports/events; it ships as a file in `files {}` and every resource/client reads it itself.

## 5. State bags and GlobalState

- **[official]** Getters are naive: every read pulls the whole serialized value from the game. Only a direct assignment writes back; a nested write like `state.x.y = 1` does not replicate. For granular updates use flat keys: `state['x:y']`.
- **[official]** By default, server writes replicate and client writes do not. With `sv_stateBagStrictMode true` only the server writes.
- **[official]** GlobalState: written by the server, read by every client.
- **[experience]** Reads are expensive, so loops never read a state bag: a change handler updates a local mirror and code reads the mirror.
- **[experience]** A removed value is written as `false`, not `null` (clients out of scope miss `nil`). GlobalState survives a resource restart; defaults are written at start.
- **[experience]** When a player enters scope the bag replicates again and handlers fire again; no extra "entered scope" event is written.
- When to use a state bag: a persistent property tied to an entity that nearby players must see (vehicle lock, fuel, is dead). When to use GlobalState: small, rarely changing server state everyone needs (weather, is an event running). Per-player data, frequently changing data and large lists never go into state bags; they travel as targeted delta events (`data.md` section 4).

## 6. Security convars (security.cfg)

| Convar | Effect | In code |
|---|---|---|
| `sv_entityLockdown relaxed` | Script entities are created only on the server (ambient peds and traffic still come from clients) | Vehicles: server `CreateVehicleServerSetter`; clients create only `isNetwork=false` local entities |
| `sv_stateBagStrictMode true` | Only the server writes replicated state bags | Clients request changes through a validated callback |
| `sv_filterRequestControl 4` | Clients cannot take control of other entities | No `NetworkRequestControlOfEntity`; the server sends an event to the owner |
| `sv_enableNetworkedScriptEntityStates false`, `sv_enableNetworkedSounds false`, `sv_scriptHookAllowed false` | Narrow what a client can affect over the network | |

Bridge note: some ready-made ESX/QB scripts create networked vehicles on the client or write state bags from the client; they do not work with these convars. The bridge cannot fix that; the script gets adapted.

## 7. Measuring

- Client: F8 `resmon 1` (ms and memory per resource). Server: `profiler record` / `profiler view`. database: `aicore_db slow` over RCON.
- A performance change is measured before and after under the same conditions, and the numbers go into the script's CLAUDE.md or the report.

## Sources

- JavaScript runtime: https://docs.fivem.net/docs/scripting-manual/runtimes/javascript/
- State bags: https://docs.fivem.net/docs/scripting-manual/networking/state-bags/
- Triggering events: https://docs.fivem.net/docs/scripting-manual/working-with-events/triggering-events/
- setTick measurement and issue #1653 quote: https://forum.cfx.re/t/javascripts-settick-is-much-slower-than-luas-citizen-createthread/4920326
- Many JS resources: https://forum.cfx.re/t/performance-of-multiple-js-resources/5255191
- Cross-resource data hitches: https://forum.cfx.re/t/be-aware-hitches-from-sending-a-lot-of-data-between-resources-server-side/1274077
- Resmon targets: https://forum.cfx.re/t/resource-monitor-and-good-values-to-aim-below-at/1568408

## Loading screen

- A `loadscreen` page gets server data only through the connection handover: in `playerConnecting`, `deferrals.handover({ key: value })` (several resources' handovers merge), read in the page as `window.nuiHandoverData`. Other resources' files are not downloaded while it shows, so its pictures ship in the same resource.
- Progress arrives as plain window messages with an `eventName` (`loadProgress` with `loadFraction`, which starts again at 0 per stage; `onDataFileEntry` / `initFunctionInvoking` with a `name`), not NUI actions.
- With `loadscreen_manual_shutdown 'yes'` the page stays until a client script calls `ShutdownLoadingScreenNui()` (ai-core's character scene does), so the empty world never shows.
