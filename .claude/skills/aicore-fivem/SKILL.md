---
name: aicore-fivem
description: FiveM development on ai-core - engine and native behaviour, state bags, OneSync, server-client data sync (snapshot + delta), the JS/TS runtime, natives lookup, RCON and the debugging workflow. Use for any work on an ai-* resource, ai-core's bridge or a new script on ai-core, before writing client/server code, choosing a native, pushing data to clients, or chasing an in-game bug.
---

# ai-core FiveM development

The project's own rules come first: `CLAUDE.md` (goals, process), `.claude/rules/*.md` (load by topic: `fivem-runtime.md`, `data-and-sync.md`, `typescript.md`, `lib.md`, `database.md`, `admin-panel.md`, `nui.md`, `compatibility.md`, `lua-bridges.md`) and the `CLAUDE.md` of the script you touch. This skill holds the engine knowledge behind them.

## Hard rules

1. **Server authoritative, strict security.** `security.cfg` runs strict entity lockdown, state bag strict mode and request-control filtering; code is written for it, never loosened. Networked entities are created on the server; clients ask through validated callbacks (lib `onClientCallback` / `onClientEvent` gate).
2. **Snapshot + delta.** Live server data reaches clients as one snapshot, then only changes, only to who needs it. No polling, no "changed, refetch" signals, no per-player data to `-1`, no constant data per tick; action answers are `{ ok }`. Read `references/sync.md` before writing any server -> client push.
3. **Our lib, not ox_lib.** ai-* resources use `@aicore-fivem/lib` (callbacks, keybinds, zones, prompts, menu, inventory, vehicle keys, commands). Missing helper? Add it to the lib.
4. **Scale first.** Plan every system for millions of records and 2048 players online; never walk every online player on a frequent path (lib `online`, `playersNear`); benchmark collection helpers (`docs/research/stress-test.md`).

## References

| File | Read when |
|---|---|
| `references/engine.md` | Any client/server code: state bags, runtime costs, `provide` and exports, official docs findings, JS native returns, entities, peds and animation, input and raycasts, DUI, how GTA does it |
| `references/sync.md` | Any server -> client data: banned patterns, snapshot per session or screen, delta actions, single push point, broadcast vs targeted, aggregates, checklist |

## Looking up natives

A native name that type-checks proves nothing: the typings and LuaLS know names the FiveM runtime does not expose, and natives were renamed between databases. Before using a native the codebase does not use yet:

```bash
python .claude/skills/aicore-fivem/tools/native.py <name | 0xHASH | words> [--doc] [--cfx | --gta]
```

It prints the function name FiveM really generates, hash, arguments, return type, client/server availability (CFX natives) and a `!!` line when the public native databases disagree; decide by the argument types and prefer natives both agree on.

## Server commands (RCON)

From the server folder: `bun tools/rcon.ts --log ../default/logs/fxserver.log --wait 3 "ensure ai-core"`. After a build, `refresh` (new files or manifest changes), `ensure` the resource and search the log for `SCRIPT ERROR`, `Failed to load script` and `[client error]`, not only "Started". Restarting a resource stops its dependents: ensure them again.

## Debugging an in-game bug

No blind fixes. When the first fix does not work or the cause is not certain from the code, measure: add temporary logs at each step of the failing path (inputs, branch decisions, entities with owner and network state, state before and after the suspect call), one prefix per hunt, each line marked `// DEBUG`; ask the tester for the exact steps and the console lines (F8 client, server console); decide the fix from that data. Label an unconfirmed fix as unconfirmed and remove every `// DEBUG` line once it is confirmed.

## Lua (bridge only)

The only Lua in the project is ai-core's `bridge/` (ESX/QB/Qbox compatibility). Lua 5.4 with full LuaLS annotations (`.claude/rules/lua-bridges.md`); check it with the Lua language server (VS Code "Lua" or "Qbox Lua" extension) and fix every diagnostic.
