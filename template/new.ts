/**
 * Creates a new resource in resources/[ai] from the clean template:
 *   bun run new <name> "<description>"     (in the server folder; same as bun template/new.ts ...)
 * <name> without the prefix ("garage" -> ai-garage). Then: bun install, bun run build in the new folder.
 */
import { cp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PREFIX = "ai-";
const [rawName, description = ""] = process.argv.slice(2);
const name = rawName?.startsWith(PREFIX)
  ? rawName
  : rawName
    ? `${PREFIX}${rawName}`
    : "";

if (!/^ai-[a-z][a-z0-9-]{1,30}$/.test(name)) {
  console.error(
    'usage: bun run new <name> "<description>"   (lowercase letters, digits, dashes)',
  );
  process.exit(1);
}
if (description.includes("'")) {
  console.error(
    "the description cannot contain ' (it is written into fxmanifest.lua inside single quotes)",
  );
  process.exit(1);
}

const root = join(import.meta.dir, "..", "resources", "[ai]");
const target = join(root, name);
const exists = await stat(target).then(
  () => true,
  () => false,
);
if (exists) {
  console.error(`${name} already exists`);
  process.exit(1);
}

// The template is a workspace member (so editors type-check it): its installed and built files stay behind.
const SKIP = new Set([
  "node_modules",
  "dist",
  "fxmanifest.lua",
  ".yarn.installed",
]);
await cp(join(import.meta.dir, "resource"), target, {
  recursive: true,
  filter: (source) =>
    !SKIP.has(source.replaceAll("\\", "/").split("/").pop() ?? ""),
});

/** Fills the placeholders in every text file of the copy. */
async function fill(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await fill(path);
      continue;
    }
    const text = await readFile(path, "utf8");
    if (!text.includes("__NAME__") && !text.includes("__DESCRIPTION__"))
      continue;
    await writeFile(
      path,
      text
        .replaceAll("__NAME__", name)
        .replaceAll("__DESCRIPTION__", description),
    );
  }
}

await fill(target);
console.log(
  `created resources/[ai]/${name}\nnext: bun install (server folder), then in ${name}: bun run build, git init, add "ensure ${name}" to server.cfg,\nand if it uses the database: add_convar_permission ${name} read mysql_connection_string (env.cfg and env.example.cfg)`,
);
