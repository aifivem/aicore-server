# Git: commits, pushes, releases (every session)

The owner's standing rules; follow them without being asked.

## Repositories

- One change usually touches several repos: the server folder (aicore-server), `packages/` (aicore-packages), every `resources/[ai]/ai-*`, the org repo (`C:\TGIANN\FivemServers\ai-core\org-github`, `aifivem/.github`: shared workflows, profile), the docs (`C:\TGIANN\aifivem-site\content\docs`, `aifivem/docs`) and the private site (`C:\TGIANN\aifivem-site`). Each is committed on its own, from inside its folder.
- Git Bash: `cd` into a folder with `[ai]` in its path first (`git -C` fails there).

## When to commit (no need to ask)

- After every meaningful step that is verified: typecheck, lint and build pass (read the exit code, never judge from `cmd | tail`), the resource restarted with a clean log when it runs on the server. Do not wait for the end of the session.
- At the end of a task: commit every repo that changed and check that none is left dirty (`git status --porcelain` in each).
- Never commit: secrets (`env.cfg`, `data/secrets.json`, webhook urls, tokens), temporary test edits to tracked files (a test `ensure` in `server.cfg` stays uncommitted and is removed after the test), third-party test resources (they live in git-ignored folders such as `resources/[test]`).
- Source and its generated files go in the same commit: `dist/`, the generated `fxmanifest.lua`, `resource/server/tables.ts`, `data/schemas/*.json`.
- A contract change in `packages/` is committed before (or with) the resources that use it.

## How to write the commit

- Conventional Commits in English, imperative, one line a server owner understands: `feat(scope): ...`, `fix(scope): ...`; `feat!:` (or a `BREAKING CHANGE:` footer) for a breaking change. Scope = the subsystem (`banking`, `vrp`, `lib`, `inventory`).
- One commit = one change. Split unrelated changes into separate commits (`git add <paths>` per change) so each line in the release notes says one thing.
- Release notes come from these types, so pick the type by what the owner should read:
  - shown: `feat` (New Features), `fix` (Bug Fixes), `perf`, `refactor`, `docs`, `chore`;
  - hidden: `build` (rebuilt `dist/` or source maps only, dependency wiring), `ci`, `test`, `style`.
  A rebuild with no source change in that repo is `build:`, never `chore:`.
- No AI attribution: no `Co-Authored-By` line, no "Generated with" text, in commits, PRs or tags.

## Push (only when the owner asks)

- Push only when the owner says so ("push", "pushla", "yayınla"); a commit is never pushed on its own.
- Before pushing: every repo committed and clean; scan the outgoing diff (`git diff @{u}..HEAD`) for secrets (Discord webhook urls, `ghp_` / `github_pat_` tokens, connection strings with passwords).
- **Pull right before every push, in every repo, every time** (owner rule; skipping it is the mistake that keeps happening): the release-please bot commits to `main` on its own (the merged release pull request bumps `package.json`, `CHANGELOG.md`, `.release-please-manifest.json` and the `version` line of `fxmanifest.lua`), so the local `main` is often behind even when nobody else worked on it. Run `git fetch origin && git pull --rebase origin main` in each repo just before its `git push`; when the pull brought a release commit, build again and drop a CRLF-only `fxmanifest.lua` change (`git checkout -- fxmanifest.lua`) before pushing. Never push with `--force` to get past a rejected push: a rejection means a bot commit is missing locally, pull it.
- Order: the org repo first (shared workflows the others call), then `packages/`, the server folder, every `ai-*`, the docs, the site.

## Releases (only when the owner asks)

- Every push to `main` makes release-please open or update a release pull request per repo. Merging it is the release (tag, GitHub release, server zip, Discord post): only when the owner asks. Version rule: `CLAUDE.md` "Process".
- After release pull requests are merged on GitHub, run `git pull --rebase origin main` in every repo before the next commit, then build again (the release commit changed `package.json` versions and the generated manifests). release-please commits `fxmanifest.lua` with CRLF line endings, so after that build every manifest shows as modified with the same bytes (`cmp <(git show HEAD:fxmanifest.lua) fxmanifest.lua`): `git checkout -- fxmanifest.lua`, nothing to commit.
