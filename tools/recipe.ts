/**
 * Writes the txAdmin recipe (`recipe/`) from this server's files: `recipe/server.cfg` (server.cfg with the recipe's
 * server name), `recipe/env.cfg` (env.example.cfg with txAdmin's variables) and `recipe/ai-core.yaml` (the server
 * files, the script bundle and one `download_github` per third-party resource of `STANDALONE` that server.cfg ensures).
 * Run after changing server.cfg or env.example.cfg: `bun tools/recipe.ts`. The bundle (`ai-scripts.zip` on the
 * "scripts" release) holds the latest release of every `ensure ai-*` script, kept current by
 * `.github/workflows/bundle.yml`: one download instead of one per script (each costs about 2 s whatever its size).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OWNER = "aifivem";
const SERVER_REPO = `https://github.com/${OWNER}/aicore-server`;
const SHARED = ["security.cfg", "misc.cfg", "permission.cfg"];
/** ai-core's `fxDependencies` `/server:<build>`: txAdmin refuses an older FXServer before installing anything. */
const MIN_FX_VERSION = 38039;
const BUNDLE = `${SERVER_REPO}/releases/download/scripts/ai-scripts.zip`;
/**
 * What an AI agent working on the installed server needs (the script update skill and the others, the rules, the
 * `bun tools/*` commands, the adapters' compatibility notes): the same files a hand install has.
 */
const AGENT_FILES = [
  ".claude",
  "tools",
  "docs/compat",
  "CLAUDE.md",
  "AGENTS.md",
];
/** Third-party resources the server ships with (`resources/[standalone]`, not in git): repository and branch. */
const STANDALONE: Record<string, { src: string; ref: string }> = {
  bob74_ipl: { src: "https://github.com/Bob74/bob74_ipl", ref: "master" },
};

function replaceOnce(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`recipe: "${from}" not found`);
  return text.replace(from, to);
}

// Line ends as LF (the files may be checked out with CRLF).
const read = (file: string) =>
  readFileSync(file, "utf8").split("\r\n").join("\n");
const cfg = read("server.cfg");
// release-please bumps the marked version line in its release pull request (extra-files, release-please-config.json).
const version = (
  JSON.parse(read(".release-please-manifest.json")) as Record<string, string>
)["."];
const ensures = [...cfg.matchAll(/^ensure (ai-[\w-]+)/gm)].map((m) => m[1]);
const standalone = Object.entries(STANDALONE).filter(([name]) =>
  new RegExp(`^ensure ${name}\\b`, "m").test(cfg),
);

mkdirSync("recipe", { recursive: true });
writeFileSync(
  "recipe/server.cfg",
  cfg.replace(/^sv_hostname ".*"$/m, 'sv_hostname "{{serverName}}"'),
);

let env = read("env.example.cfg");
env = replaceOnce(
  env,
  "# Copy this file to env.cfg and fill in the values.\n",
  "# Written by the txAdmin recipe. Edit it here: env.cfg is not in git.\n",
);
env = env.replace(/^sv_licenseKey ".*"$/m, 'sv_licenseKey "{{svLicense}}"');
env = env.replace(/^sv_maxclients \d+$/m, "sv_maxclients {{maxClients}}");
env = env.replace(
  /^endpoint_add_tcp .*\nendpoint_add_udp .*$/m,
  "{{serverEndpoints}}",
);
env = env.replace(
  /^set mysql_connection_string ".*"$/m,
  'set mysql_connection_string "{{dbConnectionString}}"',
);
for (const v of [
  "svLicense",
  "maxClients",
  "serverEndpoints",
  "dbConnectionString",
])
  if (!env.includes(`{{${v}}}`))
    throw new Error(`recipe: env.cfg lacks {{${v}}}`);
writeFileSync("recipe/env.cfg", env);

const move = (src: string, dest: string) =>
  `  - action: move_path\n    src: ${src}\n    dest: ${dest}\n`;
const yaml = [
  "$engine: 3",
  `$minFxVersion: ${MIN_FX_VERSION}`,
  "$onesync: on",
  "name: ai-core",
  `version: ${version} # x-release-please-version`,
  "author: TGIANN",
  "description: ai-core, a TypeScript FiveM framework with one admin panel for every script. ESX, QB and Qbox scripts run on it unchanged through its built-in bridge.",
  "",
  "tasks:",
  "  # The database: ai-core and every ai-* script create and update their own tables at start (no SQL to import)",
  "  - action: connect_database",
  "",
  "  # Server files: cfg templates and the files every install shares",
  `  - action: download_github\n    src: ${SERVER_REPO}\n    ref: main\n    dest: ./tmp/server\n    timeoutSeconds: 300\n`,
  ...SHARED.map((f) => move(`./tmp/server/${f}`, `./${f}`)),
  move("./tmp/server/recipe/server.cfg", "./server.cfg"),
  move("./tmp/server/recipe/env.cfg", "./env.cfg"),
  move("./tmp/server/env.example.cfg", "./env.example.cfg"),
  "",
  "  # Files for working on the server with an AI agent (skills, rules, tools, compatibility notes)",
  ...AGENT_FILES.map((f) => move(`./tmp/server/${f}`, `./${f}`)),
  "  # License, slots, endpoints, the database and the server name into the cfg files",
  "  - action: replace_string\n    mode: all_vars\n    file:\n      - ./server.cfg\n      - ./env.cfg\n",
  "  # Third-party resources the server uses",
  ...standalone.map(
    ([name, repo]) =>
      `  - action: download_github\n    src: ${repo.src}\n    ref: ${repo.ref}\n    dest: ./resources/[standalone]/${name}\n`,
  ),
  `  # ai-core and its ${ensures.length} scripts in one zip: each one's latest release, built and ready (no build tools needed), with its source`,
  `  - action: download_file\n    url: ${BUNDLE}\n    path: ./tmp/ai-scripts.zip\n    timeoutSeconds: 600\n`,
  "  - action: ensure_dir\n    path: ./resources\n",
  "  - action: unzip\n    src: ./tmp/ai-scripts.zip\n    dest: ./resources\n",
  "  # Clean up",
  "  - action: remove_path\n    path: ./tmp\n",
].join("\n");
writeFileSync("recipe/ai-core.yaml", yaml);
console.log(
  `recipe: ${ensures.length} ai-* resources, ${standalone.length} third-party`,
);
