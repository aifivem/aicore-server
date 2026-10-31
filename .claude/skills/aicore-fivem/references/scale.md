# Stress test: 1M players, 10k online

How ai-core behaves with a database that has seen 1,000,000 players and 10,000 of them online at once, what was slow, and what changed. FiveM caps one server at 2048 players (OneSync), so 10k online is a safety margin, not a target.

## Setup

- Local MariaDB 11.4, separate database `ai_core_stress` (never the server's own). `resources/[ai]/ai-core/bench/seed.ts` fills it with MariaDB's sequence engine: 1M users, 1.5M characters, 6M money accounts (4 per character), 1.5M job rows, 5M ledger rows (about 1.6 GB with indexes).
- `bench/stress.ts [pool]` runs ai-core's real DB code (`@aicore-fivem/mysql`, `users.ts`, `characters/repo.ts`, `jobs/repo.ts`, `money/account.ts`) with natives stubbed: 10k players logging in at once (account upsert, character screen with card extras, character load: accounts, jobs, gangs), then the periodic save of 10k characters, then one paycheck for 10k players. Run with `bun --preload ./bench/preload.ts bench/stress.ts 10`.
- `bench/explain.ts`: EXPLAIN of every per-login query on the seeded data.
- `packages/lib/bench/online.bench.ts`: the online mirror and proximity helpers at 2048 and 10k online (ai-core's `GetPlayersInScope` stubbed with precomputed 424 m scope lists, copied per call like the export).
- `packages/lib/bench/players.bench.ts`: per-player stores (`PendingActions`, `PlayerMap`, `Cooldowns`), `KeyedCooldowns` by character id, panel records views, the `onCharacter` restart replay and the gate's capped log preview.

## Findings

- Every per-login query uses an index and touches 1-4 rows at 1M (`fivem` unique, `user_id` key, `owner_account` unique, job and gang primary keys, `account_time` for ledger pages). Table size is not the problem; the number of statements is.
- The periodic save wrote one UPDATE per character (10k statements, 9 s, holding pool connections).
- Every money change was its own transaction (balance + ledger row): a paycheck for 10k players was 10k transactions (3.5 s), and the job-account variant serialized thousands of them on one account's queue.
- Every login wrote to `ai_core_accounts` (`INSERT IGNORE` of all account types) even when the rows existed.
- Several resources walked every online player on hot paths through ai-core exports (`GetLoadedSources()` plus a `GetCharacter` / `GetJobs` / `GetDutyJob` export call per player): ai-chat on every ranged or job channel message, ai-police on every alert, ai-scoreboard on every open, ai-management on every boss panel open, ai-cityhall and ai-death (3 m checks), the armored truck guards. At 10k online that is 10k export copies per chat message. ai-core's own death lookup scanned every player per death.

## Changes

| Change | Where |
|---|---|
| Money writes batched: changes of 50 ms go out as one transaction (summed balance delta per account with `UPDATE ... JOIN`, multi-row ledger insert, 1000 rows per statement), flushes in order | `money/writer.ts`, `money/account.ts` |
| Character save as one `UPDATE ... JOIN` per 500 characters | `characters/repo.ts` `saveCharacters`, `persistence.ts` |
| Account rows read first, only missing types inserted | `money/book.ts` `loadAccounts` |
| ai-core pool 10 connections (`ai_core_pool_size`), other resources keep 5 | `database.ts` |
| Ped death lookup by entity owner (O(1)) | `player/deaths.ts` |
| lib `online`: each resource's mirror of loaded players (character, job and gang memberships with grades, member sets per job and gang, duty, on-duty sets per job) from ai-core's events | `packages/lib/src/server/online.ts` |
| lib `playersNear(source, radius)` / `playersNearEntity(entity, radius)`: candidates from OneSync scope events instead of everyone online | `packages/lib/src/server/proximity.ts` |
| chat, police, scoreboard, management, cityhall, death, robberies truck, smallresources AFK moved to them | those resources' `resource/server` |

## Numbers

DB paths, 10k online, 1M players in the DB:

| Path | Before (pool 5) | After (pool 10) |
|---|---|---|
| 10k players joining at once | 11.1 s (899/s, p99 11.1 s) | 7.3 s (1363/s, p99 7.3 s) |
| Save of 10k characters | 9.0 s | 0.37 s |
| Paycheck for 10k players | 3.5 s | 0.26 s |

Pool size alone (old code): 5 → 11.1 s, 10 → 8.2 s, 20 → 7.4 s for the login burst; saves and paychecks did not change with the pool. After the batched writes every balance matched its last ledger row (checked on the stress database).

Memory helpers (natives stubbed):

| Online (avg. in scope) | Mirror start | `playersNear` | `nearestPlayerTo` | Walk on-duty police | Police members + grades (`jobMembers`) vs walking everyone | One `jobsChanged` |
|---|---|---|---|---|---|---|
| 2,048 (~22) | 3 ms | 6 µs | 4 µs | 4 µs | 35 µs (409 members) vs 67 µs | 1.1 µs |
| 10,000 (~112) | 9 ms | 21 µs | 18 µs | 6 µs | 117 µs (2,000 members) vs 329 µs | 1.0 µs |

A job channel message or a boss menu walks only the job's members (`online.jobMembers`), and a grade check (`online.jobGrade`) is a memory read instead of a `GetJobs` export copy.

`playersNear` / `nearestPlayerTo` cost one `GetPlayersInScope` export call (a copy of the scope list) plus one coordinate read per candidate; ai-core keeps the scope sets, so there is no seed in the resource.

Per-player stores and panel views (natives stubbed; a server holds at most 2,048 entries per store):

| Size | `PendingActions` start / take | `Cooldowns.ready` | One `playerDropped` (every store of the resource) | Records view: load / one record edit |
|---|---|---|---|---|
| 100k | 0.3 / 0.2 µs | 0.1 µs | 0.4 ms (first call) | 149 ms / 2 µs |
| 1M | 0.5 / 0.3 µs | 0.1 µs | 0.09 ms | 1.0 s / 2 µs |

`KeyedCooldowns` by character id (cooldowns that survive a reconnect): `start` 0.2 / 0.35 µs at 100k characters and 0.3 / 0.4 µs at 1M (second round includes the sweeps that drop expired entries when the map doubles), `ready` 0.06-0.09 µs; expired entries never pile up.

`onCharacter` replay of 10,000 loaded players after a restart: 23 ms including the `online` mirror start. The gate's refusal line for a ~10 MB argument list: `previewJson` 0.35 ms instead of 14 ms for `JSON.stringify` (and no 10 MB string).

`AreaStream` (`bun bench/area.bench.ts` in packages/lib; items over 8 x 8 km, 64 m cells, 3x3 areas, 2048 followers): 1M items load 0.6 s at ~84 B per item, `set` / `delete` with followers around 4 / 3 µs, 2048 snapshots 132 ms, all 2048 followers changing cell at once 119 ms (`followAll`), 0.7 ms when nobody moved. In the scripts: ai-inventory 100k drops (7x7 areas) 2048 players changing cell 85 ms; ai-exitsleeping 1M bodies ~90 MB, 2048 fresh snapshots 340 ms, 2048 cell changes 190 ms.

Admin player search (`bun bench/playerSearch.ts` in ai-core, MariaDB 11.4, own database, median of 7; 60 first x 100 last names, 2% soft-deleted):

| Search | 100k characters | 1M characters |
|---|---|---|
| Prefix `jo` (10% of names), one page | 2.4 ms | 7.0 ms |
| One word `Martinez` (first or last name) | 1.8 ms | 14.4 ms |
| Two words `john sm` | 1.3 ms | 9.9 ms |
| No match | 0.4 ms | 1.1 ms |
| Citizen id / `license:` / `discord:` | 0.5-0.8 ms | 0.5-1.6 ms |

A one-word name runs two keyset branches (first name, last name: `id < cursor ORDER BY id DESC LIMIT 26`) merged in the app; with a common prefix the optimizer walks the primary key backwards until 26 rows match, with a rare one it takes the `(deleted_at, name, ...)` index range and sorts the covered ids. Never `OFFSET`, never `LIKE '%x%'`.

## Known limits

- A crash loses at most the last 50 ms of money changes plus the flush in flight (before: the writes in flight).
- `playersNear` reaches at most the OneSync scope (~424 m); a ranged chat channel above that only reaches players in scope.
- ai-scoreboard still sends every name to the player who opens it (about 30 bytes per player).
- `ai_core_transactions` grows by one row per money change (a paycheck every 15 min for 2048 players is about 200k rows a day); it has no retention yet.
