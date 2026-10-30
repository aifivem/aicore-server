# ai-core server

The server data folder of ai-core: a public (GPL-3.0) FiveM framework and script collection in TypeScript, built so that anyone can extend it with an AI and configure everything from one in-game admin panel.

## Layout

| Path | What |
|---|---|
| `server.cfg`, `security.cfg`, `misc.cfg`, `permission.cfg` | Server config. Secrets go into `env.cfg` (copy `env.example.cfg`). |
| `resources/[standalone]/` | Third-party resources: pma-voice (`ai-mysql` stands in for oxmysql, no ox_lib). |
| `resources/[ai]/` | ai-core resources, each `ai-*` folder its own git repo. |
| `packages/` | The `@aicore-fivem/*` npm packages (own git repo). |
| `template/` | Template for new resources (`bun run new <name> "<description>"`). |
| `tools/rcon.ts` | RCON client: `bun run rcon "restart ai-core"`. |
| `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `.claude/skills/` | Instructions and knowledge for AI assistants (and a good read for people). |

## Requirements

| Dependency | Version | Why |
|---|---|---|
| FXServer (artifact) | 38039 or newer recommended; older builds still run | `onPedDeath` (citizenfx/fivem 1424ad0): the server sees player deaths itself and clients stop watching their health. On older builds ai-death falls back to a client health check. |

## Development setup

1. Install [bun](https://bun.sh) and MariaDB.
2. Copy `env.example.cfg` to `env.cfg`, fill in the license key and the database connection, create the database.
3. In this folder: `bun install`, then `bun run build`.
4. Start FXServer (txAdmin) with this folder as the server data folder.

## Working with an AI

The project is built so that someone who cannot code can ask an AI to change a script or write a new one and get a result that fits. Open this folder in Claude Code (or another agent: it reads `AGENTS.md`) and ask in your own words. The AI finds:

- `CLAUDE.md`: goals, structure, decisions, the build and check process.
- `.claude/rules/`: topic rules that load when matching files are edited.
- `.claude/skills/aicore-fivem`, `aicore-ui`, `aicore-mysql`: FiveM engine, NUI and SQL knowledge.
- `resources/[ai]/<script>/CLAUDE.md`: what each script does and why.
- `docs/compat/`: framework surfaces and notes on third-party scripts.

## License

GPL-3.0-only.
