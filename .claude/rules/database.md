---
paths:
  - "resources/**/sql/*.sql"
  - "resources/**/resource/server/**/*.ts"
  - "packages/mysql/**"
---

# Database (MariaDB, @aicore-fivem/mysql)

Load the `tgiann-mysql` skill before any SQL work (its oxmysql notes describe the same result types and parameter rules). These are the project-specific rules.

- Our own engine, no oxmysql on the server (owner decision). ai-* resources use `import { mysql } from "@aicore-fivem/mysql"` (`query`, `single`, `scalar`, `insert`, `update`, `prepare`, `rawExecute`, `transaction`, `startTransaction`, `awaitConnection`); each resource runs its own small pool in-process (`ai_mysql_pool_size`, default 5; ai-core 10 via `ai_core_pool_size`), no export hop per query.
- Typed access: the build runs `aicore-db-types`, which writes `resource/server/tables.ts` (row types `Tables`, insert shapes `TableInserts`) from `sql/main.sql`; a resource keeps `export const db = tables<Tables, TableInserts>()` in `resource/server/db.ts` and writes simple queries as `db.select(table, columns, where, { orderBy, limit })`, `db.first`, `db.insert`, `db.update(table, set, where)`, `db.remove(table, where)` (equality filters; update and delete refuse an empty filter). Joins, ranges, upserts and bulk statements stay `mysql.query<Pick<Tables["t"], "a" | "b">[]>(...)`, typed from the same file. Never edit `tables.ts`; change the SQL and build.
- Bulk writes are one statement per chunk (500-1000 rows): multi-row `INSERT`, and for updates of many rows `UPDATE t JOIN (SELECT ? AS id, ? AS v UNION ALL SELECT ?, ? ...) v ON t.id = v.id SET ...`; never one statement per row in a loop.
- Third-party scripts reach the database through `ai-mysql`, which stands in for oxmysql (`provide 'oxmysql'`, oxmysql's exports and `lib/MySQL.lua`). Never install oxmysql next to it.
- Every ai-* resource that uses the database needs `add_convar_permission <resource> read mysql_connection_string` in `env.cfg` (and `env.example.cfg`); without it the pool cannot read the connection string.
- While the database cannot be reached, queries wait (as with oxmysql) and the pool retries the connection every 2 s up to 30 s; a resource never has to retry a query itself for that.
- Every pool keeps its own statistics (queries, time, slow ones, last queries without values); `collectQueryStats()` gathers them from every resource on demand (admin tools, `aicore_db`). `mysql_debug` (`true` or a JSON list of resources) prints every query.
- `mysql.query` / `single` / `scalar` / `insert` / `update` / `prepare` reject on failure (the message names the resource and the query); `transaction` and `startTransaction` resolve false after a rollback and print the error.
- Each resource installs its own tables from `sql/main.sql` with `createDatabaseTables(ResourceName, "sql/main.sql")` (waits for the connection itself). It only applies `CREATE TABLE IF NOT EXISTS`, creates missing tables and adds missing columns; it never drops, renames, modifies columns or adds keys to existing tables. Plan indexes before the first release; a later index needs an explicit, idempotent migration step.
- Table names are prefixed with the resource (`ai_core_...`, `ai_<name>_...`). Every table: PRIMARY KEY, `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- Anything queried, filtered, aggregated or updated atomically is a real column or table. JSON columns only for free-form bags (metadata). No "everything in one player row as JSON".
- Money as integer (or `DECIMAL`), never FLOAT; times as UTC `DATETIME`; booleans `TINYINT(1)`; ids from the game as sized `VARCHAR`.
- Placeholders for every value (`?`, or `@name` / `:name` with an object); identifiers only from a fixed whitelist. `IN (?)` with an empty array is invalid SQL: return early.
- `prepare` returns one row for SELECT; use `query` for lists. Result types (same as oxmysql): `DATETIME`/`DATE` as epoch milliseconds, `DECIMAL` as string, `TINYINT(1)` as boolean through `query` but number through `prepare`, binary BLOB as a byte array, TEXT as string.
- A change to the engine (`packages/mysql`) is checked against oxmysql's behaviour: the `ai-mysql` stand-in must keep every oxmysql script working.
