# Data management: where data lives, how it is written, how it is distributed

On a FiveM server, performance depends less on how fast code runs than on where data sits and how often it moves: every DB query, event, export call and state bag read means serialization plus a copy. This file describes the data model ai-core and every `ai-*` script follow.

Core principle: **server memory is the single source of truth.** The DB is its persistent copy; clients mirror only the part they need.

## 1. Data classes

Every piece of data is put into one class of this table before it is written. Data without a clear class is a design bug.

| # | Class | Example | Persistent home | Runtime home | Path to the client |
|---|---|---|---|---|---|
| S1 | Static content (ships with code, never changes) | vehicle stats, map points, item images | resource file (`files {}`) | read once from file | the client reads the file itself, nothing crosses the network |
| S2 | Panel content (admins change it) | products, job definitions, settings | resource `data/*.json` (atomic write + `.bak`) | server memory, authoritative | what everyone needs: the client reads the file itself, asks once for changes since start, then receives patch deltas. Server-only data: never reaches clients, only admins with the panel open |
| S3 | Player data | character, money, inventory, vehicles, job | DB | online players' data in memory | snapshot + delta to its owner |
| S4 | Shared transient state | door lock, heist stage, is an event running | none (or DB when needed) | server memory | per-key GlobalState if everyone needs it; targeted delta if a group needs it |
| S5 | Entity-bound state | vehicle lock, fuel, ped is dead | DB through S3 when needed | entity state bag (server writes) | state bag replication (to nearby players) |
| S6 | Client-only preference | HUD position, volume | client KVP (`SetResourceKvp`) | client | never reaches the server |
| S7 | Logs and history | money movements, admin actions | DB, append only | write queue | paged, to admins with the panel open when needed |

- Players can download every file in `files {}`. The secret part of S2 (reward tables, webhooks, price formulas) never goes into `files`.
- S2 lives in JSON instead of the DB because content moves with git, loads with one read at start, and clients read it without the network.

## 2. Reading from the DB

- Player data is read **once** at join / character select and kept in memory. No SELECT in a tick, a frequent event, or on every screen open.
- Offline data (an offline player's balance, leaderboards) is one paged query (keyset), with a short-lived cache when needed.
- No N+1: lists come in one query with `IN (?)` or a JOIN.

## 3. Writing to the DB: three paths

The write path is chosen by how much losing the value would hurt.

**W1. Critical values: atomic, ledgered.** (ai-core's money is memory-first and batches its writes into one transaction per 50 ms window, see the stress test in `scale.md`.) Money, item transfers, purchases, ownership changes.
- One conditional SQL update: `UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?`, check `affectedRows === 1`. No read-modify-write in memory.
- Steps that must succeed together (sell = delete item + add money + log) run in one transaction; the ledger row is in the same transaction.
- The in-memory copy updates **after** commit, and the delta goes out after commit.
- A per-player lock for the duration (against action spam). No HTTP/Discord calls inside a transaction.
- ox_core keeps balances this way (`docs/compat/frameworks.md`); ESX/QB keep money in memory as JSON and write it periodically, so a crash loses money changed after the last save.

**W2. Frequently changing, non-critical values: in memory, batched.** Position, hunger/thirst, playtime, stat counters.
- A change only marks the record `dirty`. A periodic flush (e.g. 5 min) writes only dirty records with one multi-row statement (chunks of a few hundred rows).
- Everything is also written on player leave / character switch, on resource stop (`onResourceStop`) and on `txAdmin:events:serverShuttingDown`.
- Accepted risk: a crash loses W2 changes since the last flush. That is why nothing that belongs in W1 ever goes into W2.

**W3. Panel content:** `data/*.json`, in server memory, debounced atomic file write on change (temp file + rename + `.bak`). Never in the DB.

Shared rules:
- **One write in flight per record.** Two writes to the same record on parallel pool connections land out of order (the old value overwrites the new). A queue per record: a new write waits until the current one finishes, waiting writes merge (the ESX `saveQueues` pattern).
- Unchanged records are not written (dirty flag; ESX compares a JSON fingerprint every time, a dirty flag is cheaper).
- Upserts target a real PRIMARY/UNIQUE key: `INSERT ... ON DUPLICATE KEY UPDATE c = VALUES(c)`.
- Log tables use batched inserts (queue + short flush interval); old rows are pruned with a `LIMIT` loop.

## 4. Distribution to clients (snapshot + delta, HARD RULE)

Details and checklist: `sync.md`. Summary:

- **One** full snapshot at session (or screen) start, then only changes: `xSet` for a single value, `put` (upsert) / `remove` (id) for lists.
- Only to who needs it: personal data to its owner, group data to members, screen data to players with that screen open (watchers). `-1` broadcasts only for shared data that really concerns everyone.
- The push lives inside the function that changes the value (one place); callers cannot forget it.
- Action responses are `{ ok, error? }`; the new state arrives through the delta channel.
- Banned: "changed, refetch" signals, polling, constant data every tick, resending the whole object when one field changes. QB/Qbox sending the entire `PlayerData` on `SetPlayerData` / `SetMetaData` is the textbook case (`docs/compat/frameworks.md`).
- Countdowns and expiry run on the client clock (server time offset taken at snapshot); the server does not push expiry.
- High-frequency streams (blip positions) keep the last value sent per receiver; only additions, moves past a threshold and removals are sent; constant info (name, colour) once.
- Bursty sources (bulk purchases, many joins) collect dirty ids and send one delta per 1-2 s window.

## 5. Data between resources

- ai-core is the **single** owner of player, character, money, job and permission data. No other resource keeps a copy in its own table.
- Other resources mirror the fields they need in memory: fetched once at start, updated from core's server-side local events (deltas). Hot paths never call core exports (`runtime.md` section 4: every call is a copy).
- Exports return small values and are synchronous. No export returns a whole player object.
- Bridges (`es_extended`, `qb-core` compatibility) keep the `xPlayer` / `PlayerData` mirror on the Lua side and update it from the same delta events; `xPlayer.getMoney()` never goes to core.

## 6. In-memory structures (TypeScript)

- Registries use `Map`: `Map<source, Player>`, `Map<CharId, Player>`; both maps update together (inside one class).
- A stateful entity is a class: fields are set in the constructor in a fixed order (V8 hidden classes), no fields are added later, no `delete` on hot objects (removing from a collection with `Map.delete` is fine). **[claim: general V8 guides]**
- No objects/arrays/closures created inside ticks and frequent events; unchanged computations are cached. Pooling only when a measurement shows the need.
- Branded types (`CharId`) so source ids and character ids never mix.
- DB rows, event arguments, JSON: typed at the boundary through a parse function (`unknown` → a validated new object), never with `as`.

## 7. Database

- Driver: our own engine `@aicore-fivem/mysql` (owner decision): every ai-* resource runs a small mysql2 pool in-process, so queries skip the cross-resource export hop. Third-party scripts use `MySQL.*` / `exports.oxmysql` and reach `ai-mysql`, which stands in for oxmysql with the same API and result types. More connections in total, each pool small with an idle timeout.
- Schema: everything queried, filtered, aggregated or atomically updated is a real column/table. A JSON column only for a free-form bag (metadata). The ESX/QB model of "everything in one `users`/`players` row as JSON" rewrites the whole row on every save, cannot update money atomically and cannot be indexed; we do not take it.
- Every table has a PRIMARY KEY, `utf8mb4`, InnoDB; money as integer or `DECIMAL`, times as UTC `DATETIME`. Details: the `aicore-mysql` skill.
- Target engine: MariaDB 10.6+ or MySQL 8; SQL stays portable.
