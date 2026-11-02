/**
 * Clones the repositories a development setup needs into this folder: `packages/` (aicore-packages) and one
 * `resources/[ai]/<name>` per `ensure ai-*` line of server.cfg (the same list the txAdmin recipe downloads).
 * Folders that already exist are left as they are, so it is safe to run again after server.cfg gets a new script:
 * `bun tools/setup.ts`. Then `bun install` and `bun run build` in this folder.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OWNER = "aifivem";

const base = join(import.meta.dir, "..");
const cfg = readFileSync(join(base, "server.cfg"), "utf8");
const ensures = [...cfg.matchAll(/^ensure (ai-[\w-]+)/gm)].map(
  (m) => m[1] as string,
);

/** Repository name and the folder it is cloned into. */
const repos: { repo: string; dest: string }[] = [
  { repo: "aicore-packages", dest: join(base, "packages") },
  ...ensures.map((name) => ({
    repo: name,
    dest: join(base, "resources", "[ai]", name),
  })),
];

mkdirSync(join(base, "resources", "[ai]"), { recursive: true });

const started = Date.now();
let cloned = 0;
let skipped = 0;
let failed = 0;
let next = 0;

async function cloneOne({ repo, dest }: (typeof repos)[number]): Promise<void> {
  if (existsSync(dest)) {
    skipped++;
    console.log(`skip ${repo.padEnd(20)} already there`);
    return;
  }
  const t = Date.now();
  const child = Bun.spawn(
    ["git", "clone", "--quiet", `https://github.com/${OWNER}/${repo}`, dest],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (code === 0) {
    cloned++;
    console.log(`ok   ${repo.padEnd(20)} ${secs}s`);
  } else {
    failed++;
    console.log(`FAIL ${repo.padEnd(20)} ${secs}s\n${out}${err}`);
  }
}

async function worker(): Promise<void> {
  while (next < repos.length)
    await cloneOne(repos[next++] as (typeof repos)[number]);
}

await Promise.all(Array.from({ length: Math.min(4, repos.length) }, worker));
console.log(
  `setup: ${cloned} cloned, ${skipped} already there, ${failed} failed in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
if (failed) process.exit(1);
console.log("next: bun install, then bun run build");
