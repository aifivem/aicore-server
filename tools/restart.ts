#!/usr/bin/env bun
/**
 * Restarts ai-core (or `--from <resource>`) and every `ensure ai-*` of server.cfg after it, then checks in the console
 * log that each one printed "Started resource"; ensures the missing ones again (RCON is UDP and loses commands in a
 * burst) and prints script errors written meanwhile. Exit code 1 when something did not start or errored.
 *
 *   bun tools/restart.ts                       # refresh, restart ai-core, ensure all, verify
 *   bun tools/restart.ts --from ai-inventory   # only that one (and nothing else is ensured)
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { connection, rcon, serverRoot } from "./rconClient";

const { values } = parseArgs({
  options: {
    from: { type: "string", default: "ai-core" },
    log: {
      type: "string",
      default: join(serverRoot, "..", "default", "logs", "fxserver.log"),
    },
    tries: { type: "string", default: "3" },
  },
});

const { password, port } = connection();
const send = (cmd: string) => rcon("127.0.0.1", port, password, cmd, 2000);
const logPath = values.log;
if (!existsSync(logPath)) {
  console.error(`restart: no console log at ${logPath} (pass --log)`);
  process.exit(1);
}
const start = statSync(logPath).size;
const logSince = () =>
  readFileSync(logPath)
    .subarray(start)
    .toString("utf8")
    // oxlint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*m/g, "");

/** The ai-* resources server.cfg ensures, in its order (the one restarted first is left out). */
const resources =
  values.from === "ai-core"
    ? readFileSync(join(serverRoot, "server.cfg"), "utf8")
        .split(/\r?\n/)
        .map((line) => /^ensure\s+(ai-[\w-]+)/.exec(line.trim())?.[1])
        .filter((r): r is string => !!r && r !== "ai-core" && r !== "ai-mysql")
    : [];

await send("refresh");
await send(`restart ${values.from}`);
await Bun.sleep(3000);
const started = (log: string, resource: string) =>
  new RegExp(`Started resource ${resource}(\\s|$)`, "m").test(log);

let missing = [values.from, ...resources];
for (let attempt = 1; attempt <= Number(values.tries); attempt++) {
  for (const resource of missing.filter(
    (r) => r !== values.from || attempt > 1,
  )) {
    await send(`ensure ${resource}`);
    await Bun.sleep(150);
  }
  await Bun.sleep(3000);
  const log = logSince();
  missing = missing.filter((r) => !started(log, r));
  if (missing.length === 0) break;
  console.log(`try ${attempt}: not started yet: ${missing.join(", ")}`);
}

const errors = logSince()
  .split(/\r?\n/)
  .filter((line) => /SCRIPT ERROR|Failed to load|\[client error\]/.test(line));
console.log(
  `started ${1 + resources.length - missing.length}/${1 + resources.length}` +
    (missing.length ? `, missing: ${missing.join(", ")}` : ""),
);
for (const line of errors.slice(0, 20)) console.log(line);
process.exit(missing.length || errors.length ? 1 : 0);
