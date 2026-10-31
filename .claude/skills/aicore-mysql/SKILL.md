---
name: aicore-mysql
description: MySQL / MariaDB on ai-core - schema and data types, indexes, query patterns, EXPLAIN, transactions and locking, bulk writes, the @aicore-fivem/mysql engine and its typed tables, and safe operations. Use whenever work touches SQL - a resource's sql/main.sql, a query, an index, a slow path, a transaction or database settings.
---

# ai-core MySQL / MariaDB

Project rules first: `.claude/rules/database.md` (engine API, typed access, result types, table install), `.claude/rules/data-and-sync.md` (what lives in the DB, when it is written). Stress numbers and what batching bought: the `aicore-fivem` skill's `references/scale.md`.

## Workflow

1. Know the engine: local development runs MariaDB; servers may run MySQL 8 or MariaDB 10.6+. SQL in a resource must be portable between them.
2. Know the workload: which path is hot (per login, per action, per tick), how many rows it touches, who else writes the table.
3. Smallest change that solves it; prove it with `EXPLAIN` (MySQL `EXPLAIN ANALYZE`, MariaDB `ANALYZE FORMAT=JSON`), row counts and timings. Seed a separate database for load tests (ai-core `bench/seed.ts`), never the server's own.

## Schema defaults

- Every table: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, a PRIMARY KEY, name prefixed with the resource (`ai_<name>_...`). Never `utf8` (that is utf8mb3).
- Write-heavy tables: integer `AUTO_INCREMENT` keys (`BIGINT UNSIGNED` for logs); join tables: composite primary keys. No random UUID as clustered key.
- Game ids (citizen id, plate, license) are sized `VARCHAR(n)`, indexed when filtered on.
- Money and exact amounts: integers (or `DECIMAL`), never `FLOAT`. Booleans `TINYINT(1)`. Times `DATETIME`.
- `NOT NULL` with defaults unless "unknown" is a real state.
- JSON only for free-form bags (metadata); anything filtered, joined or updated atomically is a real column or table.
- Indexes live in the original `CREATE TABLE`: ai-core's installer adds missing tables and columns, never keys to existing tables.

## Indexes

- Index what the hot queries filter, join and sort on; foreign-key columns always.
- Composite order: equality columns first, then the range or sort column (leftmost prefix). A range stops filtering for later columns.
- Secondary indexes carry the primary key; a covering index (`Using index`) serves hot narrow reads, `SELECT *` defeats it.
- Every index costs writes and memory: 1-5 per table is normal; drop redundant prefixes (`(a)` next to `(a, b)`).
- Comparing a text column to a number (`owner_id = 5` on a VARCHAR) skips the index: cast the number (`CAST(id AS CHAR) COLLATE utf8mb4_unicode_ci`).
- `LIKE '%x%'` cannot use a B-tree index.

## Queries

- Explicit column lists, a placeholder for every value, identifiers only from a fixed list.
- Sargable predicates: no functions or arithmetic on indexed columns (`created_at >= ? AND created_at < ?`, not `YEAR(created_at) = ?`).
- Keyset pagination for growing lists (`WHERE id < ? ORDER BY id DESC LIMIT 20`); `OFFSET` only on small tables.
- No N+1: one query with `IN (?)` (return early on an empty list) or a JOIN.
- Atomic changes: `UPDATE t SET x = x - ? WHERE id = ? AND x >= ?` and check `affectedRows`, never read-modify-write.
- Capped insert (at most N rows per owner, also for an owner not in memory): one statement, `INSERT INTO t (...) SELECT o.id, ?, ... FROM owners o WHERE o.key = ? AND (SELECT COUNT(*) FROM t WHERE t.owner_id = o.id) < ?` (MySQL and MariaDB allow the target table in the SELECT; index `t.owner_id`); insert id 0 = refused. Two concurrent inserts can both pass, so use it for soft caps only.
- Upserts with `INSERT ... ON DUPLICATE KEY UPDATE c = VALUES(c)` on a real unique key.
- Bulk writes: one statement per 500-1000 rows. Multi-row `INSERT`; updates of many rows as `UPDATE t JOIN (SELECT ? AS id, ? AS v UNION ALL SELECT ?, ? ...) v ON t.id = v.id SET t.x = v.v`. Never one statement per row in a loop.
- `NOT EXISTS` over `NOT IN (subquery)`; `UNION ALL` over `UNION` when duplicates cannot occur.
- EXPLAIN red flags: `type: ALL` on a big table, `key: NULL`, huge `rows`, `Using filesort` / `Using temporary` on big sets.

## Transactions and locking

- Keep transactions short: no HTTP, Discord or waits inside. Read before, write inside, notify after commit.
- Lock rows in a consistent order (by primary key) across code paths; index the `WHERE` of every `UPDATE` / `DELETE`, or InnoDB locks every scanned row.
- Deadlocks (1213) and lock wait timeouts (1205) happen under load: retry an idempotent transaction a bounded number of times.
- ai-core keeps money memory-first and batches its writes (one transaction per 50 ms window); other resources never write ai-core's tables.

## The engine (`@aicore-fivem/mysql`)

- `mysql.query / single / scalar / insert / update / prepare / transaction / startTransaction`; each resource runs its own small pool in-process; `ai-mysql` stands in for oxmysql for third-party scripts.
- Results as oxmysql returns them: `DATETIME`/`DATE` epoch ms, `DECIMAL` string, `BIGINT` number (string beyond 2^53), `TINYINT(1)` boolean through `query` but number through `prepare`, TEXT string, binary BLOB a byte array.
- Typed tables: the build's `aicore-db-types` writes `resource/server/tables.ts` from `sql/main.sql`; `const db = tables<Tables, TableInserts>()` checks table names, columns, filter values and inserted rows at compile time (`db.select`, `first`, `insert`, `update`, `remove`; equality filters; update/delete refuse an empty filter). Raw SQL types its result from the same file: `mysql.query<Pick<Tables["t"], "a" | "b">[]>(...)`.
- Statistics: `bun tools/rcon.ts "aicore_db slow"` prints every resource's query stats and slow queries.

## Guardrails

- Ask before destructive or bulk operations on a real database (`DROP`, `TRUNCATE`, `DELETE`/`UPDATE` without a narrow `WHERE`, an `ALTER` that rebuilds a big table); back up first (`mariadb-dump --single-transaction`).
- Never run write tests against a live server database; use a seeded copy.
- `ALTER TABLE` on a big live table: ask for `ALGORITHM=INSTANT` (or `INPLACE, LOCK=NONE`) so it fails instead of silently copying.
- State which MySQL / MariaDB version a piece of advice depends on.
