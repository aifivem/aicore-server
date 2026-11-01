/**
 * Checks the file layout rules of `.claude/rules/resource-structure.md` ("Files and folders") in every ai-* resource
 * and the packages, or in the ones named: `bun tools/structure.ts [ai-core ai-fuel packages ...]`.
 * Reports files over the size limit, side entries (`resource/<side>/index.ts`) holding more than imports, grab-bag file or folder names (`utils`, `helpers`...) and import cycles. Exit 1 when anything is found.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const LIMIT = 200;
const BANNED = new Set([
  "utils",
  "util",
  "helpers",
  "helper",
  "misc",
  "functions",
  "stuff",
]);
const SKIP_DIRS = new Set(["node_modules", "dist", "bench", "dev", ".git"]);
const SKIP_FILES = /(^tables\.ts$|\.d\.ts$|\.bench\.ts$)/;

const base = join(import.meta.dir, "..");
const aiRoot = join(base, "resources", "[ai]");
const only = process.argv.slice(2);

interface Unit {
  name: string;
  /** Source roots of the unit and the alias prefixes that point into them. */
  roots: { dir: string; aliases: Record<string, string> }[];
}

function units(): Unit[] {
  const out: Unit[] = [];
  for (const name of readdirSync(aiRoot)) {
    const dir = join(aiRoot, name);
    if (!existsSync(join(dir, "package.json"))) continue;
    const res = join(dir, "resource");
    const roots: Unit["roots"] = [];
    if (existsSync(res))
      roots.push({
        dir: res,
        aliases: {
          common: join(res, "common"),
          "client/": join(res, "client") + "/",
          "server/": join(res, "server") + "/",
        },
      });
    if (existsSync(join(dir, "web", "src")))
      roots.push({
        dir: join(dir, "web", "src"),
        aliases: { "@/": join(dir, "web", "src") + "/" },
      });
    out.push({ name, roots });
  }
  const packages = join(base, "packages");
  if (existsSync(packages))
    out.push({
      name: "packages",
      roots: readdirSync(packages)
        .map((p) => join(packages, p, "src"))
        .filter((p) => existsSync(p))
        .map((dir) => ({ dir, aliases: {} })),
    });
  return only.length ? out.filter((u) => only.includes(u.name)) : out;
}

function walk(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(path, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !SKIP_FILES.test(entry))
      files.push(path);
  }
}

const IMPORT =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g;

/** A source file an import points to, or null for a package / missing file. */
function target(
  from: string,
  spec: string,
  aliases: Record<string, string>,
): string | null {
  let path: string | null = null;
  if (spec.startsWith(".")) path = resolve(dirname(from), spec);
  else
    for (const [alias, dir] of Object.entries(aliases))
      if (spec === alias.replace(/\/$/, "") || spec.startsWith(alias)) {
        path = alias.endsWith("/") ? join(dir, spec.slice(alias.length)) : dir;
        break;
      }
  if (path === null) return null;
  for (const candidate of [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    join(path, "index.ts"),
    join(path, "index.tsx"),
  ])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

/** Cycles in the import graph (Tarjan's strongly connected components with more than one file or a self import). */
function cycles(graph: Map<string, string[]>): string[][] {
  let index = 0;
  const stack: string[] = [];
  const on = new Set<string>();
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const out: string[][] = [];
  const visit = (v: string): void => {
    idx.set(v, index);
    low.set(v, index++);
    stack.push(v);
    on.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1 || (graph.get(v) ?? []).includes(v)) out.push(scc);
    }
  };
  for (const v of graph.keys()) if (!idx.has(v)) visit(v);
  return out;
}

/** Lines of an entry file that are not imports, comments or blank. */
function entryLogic(text: string): number {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const withoutImports = code.replace(
    /(?:^|\n)\s*import[\s\S]*?["'][^"']+["'];?/g,
    "\n",
  );
  return withoutImports.split("\n").filter((line) => line.trim() !== "").length;
}

/** Lua roots the rules cover (`lua-bridges.md` "Files and folders (Lua)"); `bridge/lib` is ai-lib's copy, `data/` holds tables. */
const LUA_ROOTS = ["bridge", "lua"];
const LUA_SKIP = new Set(["node_modules", "lib", "data"]);

function luaFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!LUA_SKIP.has(entry)) luaFiles(path, out);
    } else if (entry.endsWith(".lua")) out.push(path);
  }
}

/** Size, grab-bag names and global tables created in more than one file, for one resource's Lua. */
function luaFindings(resource: string): string[] {
  const out: string[] = [];
  const creators = new Map<string, string[]>();
  for (const sub of LUA_ROOTS) {
    const dir = join(aiRoot, resource, sub);
    if (!existsSync(dir)) continue;
    const files: string[] = [];
    luaFiles(dir, files);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      // A copied third-party file carries a whole-file `---@diagnostic disable` near its top and stays unchanged.
      if (
        /^---@diagnostic disable\s*$/m.test(
          text.split("\n").slice(0, 12).join("\n"),
        )
      )
        continue;
      const rel = relative(base, file).replace(/\\/g, "/");
      const count = text.split("\n").length;
      if (count > LIMIT) out.push(`  size     ${rel} (${count} lines)`);
      const stem = basename(file, ".lua");
      const folders = relative(dir, dirname(file)).split(/[\\/]/);
      if (BANNED.has(stem) || folders.some((f) => BANNED.has(f)))
        out.push(`  name     ${rel}`);
      for (const match of text.matchAll(/^([A-Za-z_][\w]*)\s*=\s*\{/gm)) {
        const name = match[1];
        if (!name) continue;
        const list = creators.get(name) ?? [];
        list.push(rel);
        creators.set(name, list);
      }
    }
  }
  // Client and server are separate Lua states: a table created once per side is fine; a shared file counts for both.
  const sideOf = (rel: string): "client" | "server" | "shared" =>
    /client/i.test(rel) ? "client" : /server/i.test(rel) ? "server" : "shared";
  for (const [name, list] of creators) {
    const sides = list.map(sideOf);
    const clash =
      sides.filter((s) => s === "client").length > 1 ||
      sides.filter((s) => s === "server").length > 1 ||
      (sides.includes("shared") && list.length > 1);
    if (clash) out.push(`  global   ${name} created in ${list.join(", ")}`);
  }
  return out;
}

let problems = 0;
const summary: string[] = [];
for (const unit of units()) {
  const lines: string[] = [];
  const graph = new Map<string, string[]>();
  for (const root of unit.roots) {
    const files: string[] = [];
    walk(root.dir, files);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const rel = relative(base, file).replace(/\\/g, "/");
      const count = text.split("\n").length;
      if (count > LIMIT) lines.push(`  size     ${rel} (${count} lines)`);
      const stem = basename(file).replace(/\.(ts|tsx)$/, "");
      const folders = relative(root.dir, dirname(file)).split(/[\\/]/);
      // shadcn/ui's generator imports `cn` from `@/lib/utils`: that one file keeps its name.
      const shadcn = /web[\\/]src[\\/]lib[\\/]utils\.ts$/.test(file);
      if (!shadcn && (BANNED.has(stem) || folders.some((f) => BANNED.has(f))))
        lines.push(`  name     ${rel}`);
      const isEntry = /resource[\\/](client|server)[\\/]index\.ts$/.test(file);
      if (isEntry && entryLogic(text) > 0)
        lines.push(
          `  entry    ${rel} (${entryLogic(text)} lines besides imports)`,
        );
      const deps: string[] = [];
      for (const match of text.matchAll(IMPORT)) {
        const spec = match[1];
        if (!spec) continue;
        const to = target(file, spec, root.aliases);
        if (to) deps.push(to);
      }
      graph.set(file, deps);
    }
  }
  for (const scc of cycles(graph))
    lines.push(
      `  cycle    ${scc.map((f) => relative(base, f).replace(/\\/g, "/")).join(" <-> ")}`,
    );
  if (unit.name !== "packages") lines.push(...luaFindings(unit.name));
  problems += lines.length;
  summary.push(`${unit.name.padEnd(20)} ${lines.length}`);
  if (lines.length) console.log(`${unit.name}\n${lines.join("\n")}`);
}
console.log(`\n${summary.join("\n")}\nstructure: ${problems} finding(s)`);
process.exit(problems > 0 ? 1 : 0);
