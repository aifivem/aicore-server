---
paths:
  - "resources/**/package.json"
  - "resources/**/tsdown.config.ts"
  - "resources/**/tsconfig.json"
  - "resources/**/public/**"
  - "resources/**/scripts/*.ts"
  - "resources/**/types/*.d.ts"
  - "template/**"
  - "packages/**"
  - "package.json"
---

# Resource structure (overextended/fivem-ts)

Every script follows https://github.com/overextended/fivem-ts, adapted in `template/resource`. A new script always starts from there (`bun run new <name> "<description>"` in the server folder); never download the boilerplate or copy another resource and clean it up. A change to the build setup (tsdown, postBuild, tsconfig) goes into the template too.

## Layout

- `resource/client`, `resource/server`, `resource/common`: source, entry `index.ts`. Path aliases `common`, `client/*`, `server/*`, `public/*`, `types/*`.
- `locales/*.json`: lang files read by `createLocale` (`en.json` complete base).
- `public/`: static files and client-readable config copied to `dist/` (`public/config.json`, typed with `LoadFile("public/config.json")`). `types/public.d.ts` is generated, never edited.
- `data/`: panel-edited content (`data/*.json`), server-side only unless the resource lists it in `files`.
- `sql/main.sql`: the resource's tables, installed by `createDatabaseTables` at start.
- `web/`: NUI (Vite), output `dist/web`, `ui_page` added automatically.
- `scripts/`: build helpers (`postBuild.ts`, `typegen.ts`).
- `LICENSE` (GPL-3.0), `CLAUDE.md`, `.gitignore`: every resource is its own git repo.

## Build and manifest

- `fxmanifest.lua` is generated from `package.json` (name, author, version, license, description, `fxDependencies` → `dependencies`, files). Never edit it; a manifest addition changes `scripts/postBuild.ts`.
- `fxDependencies` may hold runtime constraints (`/onesync`, `/server:<build>`). `fxProvide` writes `provide` lines, `fxFiles` adds files outside `public/`, `fxVersion` overrides the manifest version (a stand-in reporting the version it mirrors). A side without `resource/<side>/index.ts` builds nothing: no `resource/client/index.ts` = server-only (no `client_script`), no `resource/server/index.ts` = client-only (no `server_script`; drop that side from the `typecheck` script). Never keep an empty index file for a side.
- `package.json` `description` must not contain `'`: it is written into fxmanifest inside single quotes and the resource fails with "Could not parse resource metadata".
- Commands (in the resource): `bun run build` (tsdown, then the client error wrapper), `bun run typecheck`, `bun run lint`, `bun run dev` (watch). In the server folder the same scripts run for every resource.
- The workspace root is the server folder (`package.json` there). Workspace globs write `[ai]` as `[[]ai]` (a literal `[`); bun's glob skips dot folders, so nothing in the workspace may live in a dot folder. Keep `node_modules` out of `resources/`: FXServer treats every folder there as a resource ("does not have a resource manifest").
- Never delete a `node_modules` folder by hand (`rm -rf`, Explorer, `Remove-Item -Recurse`): bun links the workspace packages into it as Windows junctions, and a recursive delete follows them and wipes the real `packages/*` sources. Change dependencies and run `bun install`; it relinks what is needed.
- Order after a change: typecheck → lint → build. tsdown does not type check.
- A resource with a NUI (`web/`, workspace name `<resource>-web`) builds it first: `"build": "bun run --cwd web build && bun tsdown -- && aicore-client-errors dist/client.js"` (postBuild lists `dist/web` files in the manifest, so the web output must exist before tsdown). The web build runs `tsc --noEmit` itself. Browser preview: `bun run webdev` with mock answers in `web/src/dev/`.
- Client bundle `iife` / es2023 (browser platform, no Node API); server `cjs` / Node 22. Every npm package is bundled in.
- The server bundle starts with the `exports = globalThis.exports;` banner: FXServer wraps server scripts in a CommonJS function whose `exports` parameter shadows FiveM's `exports`. Keep it.
- Client errors reach the server: `aicore-client-errors dist/client.js` (from `@aicore-fivem/build`) puts a reporter in front of the client bundle and a try/catch around it; ai-core logs them on channel `clientErrors` as `[client error] <resource>: ...` with the player. Nothing to add by hand.
- tsdown `deps` options take RegExp (`alwaysBundle: [/.*/]`); a string `"/.*/"` is read as a package name and dependencies stay external ("No name was provided for external module").
- `dist/` and `fxmanifest.lua` are committed: servers run without bun. A source change is always committed with its build.
- Dependencies on our packages use the npm range (`"@aicore-fivem/lib": "^0.1.0"`), never `workspace:*`: the repo must also build outside the workspace. Inside `resources/[ai]` bun links the local package when its version satisfies the range.

## public/ reaches clients

- Every file in `public/` is in `files` and players can download it. Server-only data (webhooks, API keys, reward tables, price formulas) never goes into `public/`; it goes into a server-side file or a convar in `env.cfg`.
- Stream files (ydr, ytd, ycd, gfx) go into the resource's `stream/` folder, not into the manifest.
