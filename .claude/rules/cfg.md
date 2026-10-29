---
paths:
  - "*.cfg"
---

# Server cfg files

- `server.cfg` (identity, exec order, ensure list), `security.cfg` (security convars and blocked net game events), `misc.cfg` (game and library settings), `permission.cfg` (ACE / principals), `env.cfg` (secrets and machine values, not in git; template `env.example.cfg`).
- Never put `;` in a comment: FXServer splits commands on it even after `#`, and the rest runs as a command ("No such command").
- `env.cfg` holds only what the server needs to start: license key, endpoints, database connection, RCON, dev mode (owner decision). Every other setting, secrets like webhook urls and API keys included, is panel-edited in the resource (`data/*.json`, secrets in the git-ignored `data/secrets.json`); never add convars for them.
- Secrets use `set`, never `setr`/`sets` (those reach clients or the server list). Lock a secret convar to the resources that need it with `add_convar_permission <resource> read <convar>`; every ai-* resource with a database pool needs its line for `mysql_connection_string`.
- `rcon_password` needs `set rcon_password "..."`; a bare `rcon_password` line leaves RCON off. RCON only on development servers.
- `security.cfg` values are never loosened to make a script work; the script is adapted.
- A new resource gets its `ensure` line in `server.cfg` after its dependencies, with a short comment saying what it is.
- OneSync is set from txAdmin's settings, not in cfg.
- Server list metadata (name, description, tags, language, banner and profile images, Discord link) is managed in the Cfx Portal (https://portal.cfx.re/). FXServer no longer reads `sv_projectName`, `sv_projectDesc`, `tags`, `locale`, `banner_detail`, `banner_connecting`; never add them to a cfg. Blank Portal fields list the server as "Missing server data".
