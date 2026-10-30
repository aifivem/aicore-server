# Stress test: 1M players, 10k online

How ai-core behaves with a database that has seen 1,000,000 players and 10,000 of them online at once, what was slow, and what changed. FiveM caps one server at 2048 players (OneSync), so 10k online is a safety margin, not a target.

## Setup

- Local MariaDB 11.4, separate database `ai_core_stress` (never the server's own). `resources/[ai]/ai-core/bench/seed.ts` fills it with MariaDB's sequence engine: 1M users, 1.5M characters, 6M money accounts (4 per character), 1.5M job rows, 5M ledger rows (about 1.6 GB with indexes).
- `bench/stress.ts [pool]` runs ai-core's real DB code (`@aicore-fivem/mysql`, `users.ts`, `characters/repo.ts`, `jobs/repo.ts`, `money/account.ts`) with natives stubbed: 10k players logging in at once (account upsert, character screen with card extras, character load: accounts, jobs, gangs), then the periodic save of 10k characters, then one paycheck for 10k players. Run with `bun --preload ./bench/preload.ts bench/stress.ts 10`.
- `bench/explain.ts`: EXPLAIN of every per-login query on the seeded data.
- `packages/lib/bench/online.bench.ts`: the online mirror and proximity helpers at 2048 and 10k online.

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
| lib `online`: each resource's mirror of loaded players (character, job and gang names, duty, on-duty sets per job) from ai-core's events | `packages/lib/src/server/online.ts` |
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

| Online | Mirror start | Scope seed (once) | `playersNear` | Walk on-duty police |
|---|---|---|---|---|
| 2,048 | 4 ms | 18 ms | 6 µs | 3 µs |
| 10,000 | 5 ms | 255 ms | 21 µs | 9 µs |

## Known limits

- A crash loses at most the last 50 ms of money changes plus the flush in flight (before: the writes in flight).
- `playersNear` reaches at most the OneSync scope (~424 m); a ranged chat channel above that only reaches players in scope.
- The scope seed runs once when a resource first asks after its start (255 ms at 10k online, 18 ms at 2048).
- ai-scoreboard still sends every name to the player who opens it (about 30 bytes per player).
- `ai_core_transactions` grows by one row per money change (a paycheck every 15 min for 2048 players is about 200k rows a day); it has no retention yet.
