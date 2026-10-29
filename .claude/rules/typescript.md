---
paths:
  - "resources/**/*.{ts,tsx}"
---

# TypeScript (scripts and NUI)

- The fivem-ts tsconfig stays strict (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`). No `any`; unknown data is taken as `unknown` and narrowed. Data from a boundary (net event, callback argument, NUI payload, DB row, JSON, another resource's export) enters a type through validation, never `as X`.
- Boundary data goes through a parse function: `toX(value: unknown): X | null` returns a new object (extra fields drop). Search for an existing parser before writing one; no schema library. Handlers stay thin: parse, call, respond.
- MessagePack can turn a missing value into `null`: check optional values with `!= null`, normalize with `?? undefined` at the boundary. Validate by type and range, not truthiness (`0` and `false` are valid).
- In a server handler, copy `source` (`eventSource()`) on the first line, before any `await`: FiveM resets it.
- `as` only after validation; a type argument on an untyped call (`triggerServerCallback<T>`) is a cast too. Literal config/tables use `satisfies X`. A type guard checks everything it claims.
- Variants are `kind`-discriminated unions (not a boolean plus optional fields); a switch's default branch is `const _exhaustive: never = x;`.
- Where a server id (`source`) and a character id can mix, use a branded type (`number & { readonly __brand: "CharId" }`) checked once at the boundary. FiveM for GTAV Enhanced reuses server ids, so nothing persistent is keyed by `source`.
- Another resource's export is wrapped once in a typed function that parses its result. Stored JSON (KVP, metadata) carries a version field and a `try/catch`.
- Every `.ts`/`.tsx` file belongs to a tsconfig, or the editor checks it as an inferred project and shows errors `typecheck` never sees: tools and `template/new.ts` use the server root `tsconfig.json`, each `web/tsconfig.json` includes `vite.config.ts`, `template/resource` is a workspace member (it has its own `node_modules`). A new file outside these goes into one of them.
- An API whose handler's parameter types come from a parser takes the options before the handler (`fn(name, { args }, handler)`): TypeScript fixes a type parameter at the first context-sensitive argument, so a handler written first gets the default type. Without a parser the handler takes no parameters.
- Type-only imports use `import type`. oxfmt decides formatting.
- Types, constants, event names and payload types shared by client and server live in `resource/common/`; contracts between resources in `@aicore-fivem/shared`. Event/callback/NUI message names come from one constants file.
- Class or function: "does it need to remember state?" Yes → a class that keeps the state and its operations together (`Player`, `PlayerRegistry`, `Cooldown`, `TickLoop`). No → a plain function (validation, conversion, native wrappers). Event/export registration stays at module level and hands the work to a class or function. React components and hooks are always functions. Red flag: module-level `let` state plus functions reading/writing it, or a pile of functions taking the same object first; both become a class.
- `try/catch` only at real error boundaries (database, HTTP, JSON.parse). Errors are never swallowed: log with context or rethrow.
- No condition-wait loops (`while (!x) await sleep()`): `waitFor(check, timeoutMs?)` from `@aicore-fivem/lib/shared`.
- One-off delay `setTimeout`. Periodic watcher `setInterval` / `clearInterval`. Per-frame work (drawing, control reads) uses `setTick` and is cleared when done; no idle ticks (each costs ~0.05 ms in resmon). Prefer `TickLoop` from `@aicore-fivem/lib/client`.
- No object/array/closure allocation inside ticks or frequent events.
- Files stay under ~200 lines; split past 150.
- Comments are English and short, and carry only the constraint the code cannot show. Reasons and history go into the script's `CLAUDE.md`.
