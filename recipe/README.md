# ai-core txAdmin recipe

Installs a ready ai-core server with txAdmin: the server files (cfg templates, security, permissions), the database connection and every ai-* script.

## Install

1. Install FXServer and open txAdmin (https://docs.fivem.net/docs/server-manual/setting-up-a-server-txadmin/).
2. In txAdmin's setup choose **Popular Recipes > Remote URL Template** and paste:
   `https://raw.githubusercontent.com/TGIANN/aicore-server/main/recipe/ai-core.yaml`
3. Fill in the server name, the license key (https://portal.cfx.re/) and a MariaDB / MySQL database. ai-core and the scripts create their own tables at the first start: there is no SQL file to import.
4. Start the server, join, and follow the welcome card: it shows the line to make yourself an admin (`permission.cfg`). The admin panel (F10) has a setup guide.

The server list name, description, tags, language, banners and Discord link are set at https://portal.cfx.re/servers, not in `server.cfg`.

## What it writes

- `server.cfg`: the resource list (`ensure` lines) and config includes, `sv_hostname` from the name you enter.
- `env.cfg`: license, slots, endpoints and the database connection (machine-specific, not in git; `env.example.cfg` is the template).
- `security.cfg`, `misc.cfg`, `permission.cfg`: shared settings. Never loosen `security.cfg`: every ai-* script is written for its strict values.
- `resources/[ai]/ai-*`: each script from its own repository with its build committed, so no build tools are needed.

Third-party scripts (ESX / QB / Qbox) go into `resources/` with their dependencies; ai-core presents itself as `es_extended`, `qb-core` and `qbx_core`.

## Maintainers

`recipe/` is generated from the server's own files: run `bun tools/recipe.ts` after changing `server.cfg` (a new `ensure ai-*` line becomes a download) or `env.example.cfg`, and commit the result.
