---
paths:
  - "resources/**/resource/**/*.ts"
  - "resources/**/web/src/**/*.{ts,tsx}"
---

# Data and sync

Server memory is the source of truth; the DB is its persistent copy; clients mirror only what they need. Reasoning and sources: `docs/research/data-management.md`.

## Where data lives

| Class | Example | Persistent | Runtime | To the client |
|---|---|---|---|---|
| Static content | vehicle stats, map points | resource file in `files` | read once | client reads the file itself |
| Panel content | products, job definitions, settings | resource `data/*.json` | server memory | file read locally + changes since start + patch deltas; server-only data only to admins with the panel open |
| Player data | character, money, inventory, jobs | DB | online players in memory | snapshot + delta to the owner |
| Shared transient state | door lock, heist stage | none | server memory | per-key GlobalState (everyone) or targeted deltas (a group) |
| Entity-bound state | vehicle lock, fuel | via player data | entity state bag | replication to nearby players |
| Client preference | HUD position | client KVP | client | never sent |
| Logs | money movements, admin actions | DB, append only | write queue | paged, to admins on request |

Data without a class is a design bug. Players can download everything in `files`; secret panel data stays out of it. Panel-edited secrets (webhook urls, API keys) go into the resource's `data/secrets.json`, which every resource's `.gitignore` excludes; the panel edits it like any other data file.

## Reading

- Player data is read once at join / character select and kept in memory. No SELECT in a tick, a frequent event or on every screen open. Lists come in one query (`IN (?)` or JOIN), never N+1.

## Writing

- **Critical values** (money, item transfers, purchases, ownership): one conditional SQL statement (`UPDATE ... SET balance = balance - ? WHERE id = ? AND balance >= ?`, check `affectedRows === 1`); steps that belong together plus the ledger row in one transaction; memory and the delta update after commit; a per-player lock for the duration; no HTTP inside a transaction.
- **Frequent, non-critical values** (position, needs, playtime, counters): mark dirty in memory; a periodic flush writes only dirty records with one multi-row statement; also flush on leave / character switch, `onResourceStop` and `txAdmin:events:serverShuttingDown`.
- **Panel content**: `data/*.json`, debounced atomic write (temp file + rename + `.bak`).
- One write in flight per record (`WriteQueue` or a per-record queue); unchanged records are not written; upserts target a real PRIMARY/UNIQUE key.

## Sending (snapshot + delta, HARD RULE)

- One full snapshot per session or screen, then only changes: `xSet` for a value, `put` (upsert) / `remove` (id) for lists.
- Only to who needs it: personal data to its owner, group data to members, screen data to watchers (snapshot callback subscribes, screen close unsubscribes, `playerDropped` and leaving prune). `-1` only for data that concerns everyone.
- The push lives inside the mutator, once; callers never push.
- Action responses are `{ ok, error? }`; the new state arrives as a delta.
- Banned: "changed, refetch" signals, polling, constant data every tick, resending a whole object for one field, per-player data to `-1`.
- Countdowns and expiry run on the client clock (server time offset taken at snapshot).
- Streams (positions, blips): per receiver keep what was sent; send only additions, moves past a threshold and removals; constant info once.
- Bursty sources collect dirty ids and flush one delta per 1-2 s window.

## Between resources

- ai-core alone owns player, character, money, job, gang and permission data; no other resource stores a copy in its own table.
- Other resources mirror the fields they need, fetched once and updated from ai-core's local delta events; hot paths never call ai-core exports.
- Never walk every online player on a frequent path (`GetLoadedSources()` + an export per player): who is on duty, a character name or job comes from lib `online`, who is near from `playersNear` / `playersNearEntity` (scope candidates). Measured: `docs/research/stress-test.md`.
- Bridges keep the ESX `xPlayer` / QB `PlayerData` mirror on the Lua side from the same delta events.

## In memory (TypeScript)

- Registries are `Map`s (`Map<source, Player>`, `Map<CharId, Player>`) updated together inside one class.
- Stateful entities are classes with every field set in the constructor; no fields added later; no `delete` on hot objects.
