/**
 * Runs one package.json script (build, typecheck, lint, format) in every ai-* resource, or in the ones named:
 * `bun tools/run.ts build [ai-core ai-fuel ...]`. A few at a time (CPU count / 2), each with its time, a failing one
 * prints its output; exits when every child exited (`bun run --filter` can hang on a child's stray pipe).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";

const [first, ...only] = process.argv.slice(2);
if (!first) {
  console.error("usage: bun tools/run.ts <script> [resource...]");
  process.exit(1);
}
const script = first;

const root = join(import.meta.dir, "..", "resources", "[ai]");
const resources = readdirSync(root)
  .filter(
    (name) =>
      name.startsWith("ai-") && (only.length === 0 || only.includes(name)),
  )
  .filter((name) => {
    const file = join(root, name, "package.json");
    if (!existsSync(file)) return false;
    const scripts = (
      JSON.parse(readFileSync(file, "utf8")) as {
        scripts?: Record<string, string>;
      }
    ).scripts;
    return Boolean(scripts?.[script]);
  });

const limit = Math.max(2, Math.floor(availableParallelism() / 2));
const started = Date.now();
let failed = 0;
let next = 0;

async function runOne(name: string): Promise<void> {
  const t = Date.now();
  const child = Bun.spawn(["bun", "run", script], {
    cwd: join(root, name),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (code === 0) console.log(`ok   ${name.padEnd(20)} ${secs}s`);
  else {
    failed++;
    console.log(`FAIL ${name.padEnd(20)} ${secs}s\n${out}${err}`);
  }
}

async function worker(): Promise<void> {
  while (next < resources.length) await runOne(resources[next++] as string);
}

await Promise.all(
  Array.from({ length: Math.min(limit, resources.length) }, worker),
);
console.log(
  `${script}: ${resources.length - failed}/${resources.length} ok in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
process.exit(failed ? 1 : 0);
