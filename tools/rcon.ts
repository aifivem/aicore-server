#!/usr/bin/env bun
/**
 * FXServer RCON client, for people and AI agents alike.
 *
 *   bun tools/rcon.ts "restart ai-core"
 *   bun tools/rcon.ts --log ../default/logs/fxserver.log --wait 3 "ensure ai-core"
 *
 * Password and port come from env.cfg next to server.cfg (`set rcon_password "..."`, `endpoint_add_udp`),
 * or from --cfg / --password / --port. RCON only returns what the command prints; errors raised later
 * (script errors after a restart) go to the console log, so pass --log to print the lines written meanwhile.
 * A new resource or a changed fxmanifest.lua needs "refresh" before "ensure". Restarting everything: `restart.ts`.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import { readCfg, rcon, serverRoot } from "./rconClient";
import { join } from "node:path";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cfg: { type: "string", multiple: true },
    host: { type: "string", default: "127.0.0.1" },
    port: { type: "string" },
    password: { type: "string" },
    timeout: { type: "string", default: "3" },
    log: { type: "string" },
    wait: { type: "string", default: "2" },
  },
});

const command = positionals.join(" ").trim();
if (!command) {
  console.error(
    'usage: bun tools/rcon.ts [--cfg env.cfg] [--log <fxserver.log> --wait 3] "<command>"',
  );
  process.exit(1);
}

const defaultCfg = join(serverRoot, "env.cfg");
const cfgPaths = values.cfg ?? (existsSync(defaultCfg) ? [defaultCfg] : []);
const fromCfg = readCfg(cfgPaths);
const password = values.password ?? fromCfg.password;
const port = Number(values.port ?? fromCfg.port ?? 30120);

if (!password) {
  console.error(
    'rcon: no rcon_password (set rcon_password "..." in env.cfg, or pass --password)',
  );
  process.exit(1);
}

const logPath = values.log;
const logOffset =
  logPath && existsSync(logPath) ? statSync(logPath).size : null;

const reply = await rcon(
  values.host ?? "127.0.0.1",
  port,
  password,
  command,
  Number(values.timeout) * 1000,
);
if (reply.trim()) console.log(reply.trimEnd());
else if (logOffset === null)
  console.log(
    "(no reply: wrong password, RCON disabled, or the command prints nothing)",
  );

if (logPath && logOffset !== null) {
  await Bun.sleep(Number(values.wait) * 1000);
  const text = readFileSync(logPath)
    .subarray(logOffset)
    .toString("utf8")
    // oxlint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*m/g, "");
  if (text.trim()) console.log(`--- console log ---\n${text.trimEnd()}`);
}
