# Credits

AI Core stands on the work of the open-source FiveM community. Its framework bridge answers the ESX, QBCore and Qbox APIs, its lib covers what ox_lib offers, and many ai-* scripts were written by reading the open-source scripts below: their features, default places (counters, NPCs, spots, cameras), configuration values and, where the license allows, their code. Thank you to everyone who built and shared them.

AI Core is released under the GNU GPL v3 (`LICENSE` in every repository), which keeps it compatible with the GPL and LGPL projects it learned from. Every project keeps its own copyright; the names below are trademarks of their owners and are used only to describe compatibility.

## Frameworks

| Project | Authors | License | What AI Core takes from it |
|---|---|---|---|
| [ESX Legacy](https://github.com/esx-framework/esx_core) | ESX Framework | GPL-3.0 | API of the `es_extended` bridge (xPlayer, events, callbacks), job and account model; its weapon table (`bridge/esx/weapons.lua`), OneSync, scaleform, account operation and `imports.lua` code copied into the bridge |
| [QBCore](https://github.com/qbcore-framework/qb-core) | QBCore Framework | GPL-3.0 | API of the `qb-core` bridge (Player object, metadata, events, commands), shared items, jobs, gangs, default places; its Shared helpers, starter items, locations and config copied into the bridge |
| [Qbox](https://github.com/Qbox-project/qbx_core) | Qbox Project | GPL-3.0 | API of the `qbx_core` bridge, multi-job and group ideas, many qbx_* scripts listed below; `modules/lib.lua`, `hooks.lua`, `logger.lua`, `shared/vehicles.lua` and `shared/weapons.lua` copied unchanged into ai-core for scripts that include them |
| [ox_core](https://github.com/overextended/ox_core) | Overextended | LGPL-3.0 | Data model and server-authoritative design ideas |
| [ND Core](https://github.com/ND-Framework/ND_Core) | ND Framework | GPL-3.0 | Framework comparison |
| [vRP](https://github.com/vRP-framework/vRP) | ImagicTheCat | MIT | API of the `vrp` bridge (vRP 1, 2 and 0.5 call style); ai-core ships vRP's `lib/` (Proxy and Tunnel wire format, utils, Luaoop, IDManager, Tools, Lang, Luang), `vRPShared.lua`, `client/vRP.lua` and `cfg/lang/en.lua` with the MIT notice kept |
| [vRP 3](https://github.com/vRP-framework/vRP3-Dev) | vRP Framework | MIT | vRP 3 differences of the `vrp` bridge (`formatNumber`, events) |
| [htmlEntities-for-lua](https://github.com/TiagoDanin/htmlEntities-for-lua) | Tiago Danin | MIT | `lib/htmlEntities.lua` as vRP ships it |

## Libraries and tooling

| Project | Authors | License | What AI Core takes from it |
|---|---|---|---|
| [ox_lib](https://github.com/overextended/ox_lib) | Overextended | LGPL-3.0 | The shape of `@aicore-fivem/lib` (callbacks, points, zones, cache, skill check, progress, menus), written again in TypeScript; its vehicle properties code (`bridge/core/vehicleprops.lua`) and `require` loader (ESX `imports.lua` without ox_lib) copied into the bridge |
| [oxmysql](https://github.com/overextended/oxmysql) | Overextended | LGPL-3.0 | The API and return shapes `ai-mysql` answers |
| [fivem-ts](https://github.com/overextended/fivem-ts) | Overextended | Unlicense | Resource layout and build setup of every ai-* script |
| [cfx-server-data](https://github.com/citizenfx/cfx-server-data) | Cfx.re | MIT | The `chat` resource API `ai-chat` answers |

## Scripts

| Project | Authors | License | Used for |
|---|---|---|---|
| [ox_inventory](https://github.com/overextended/ox_inventory) | Overextended | GPL-3.0 | API `ai-inventory` answers, item and stash model |
| [ox_target](https://github.com/overextended/ox_target) | Overextended | MIT | API `ai-target` answers |
| [qb-target](https://github.com/qbcore-framework/qb-target) | QBCore Framework | GPL-3.0 | Target adapter of lib `Points` (its API, no code taken) |
| [sleepless_interact](https://github.com/Sleepless-Development/sleepless_interact) | Sleepless Development | GPL-3.0 | Target adapter of lib `Points` (its API, no code taken) |
| [interact](https://github.com/darktrovx/interact) | darktrovx and contributors | CC BY-NC-SA 4.0 | Target adapter of lib `Points` (its API, no code taken) |
| [ox_fuel](https://github.com/overextended/ox_fuel) | Overextended | GPL-3.0 | `ai-fuel` |
| [qb-inventory](https://github.com/qbcore-framework/qb-inventory) | QBCore Framework | GPL-3.0 | API `ai-inventory` answers, item pictures |
| [qb-* scripts](https://github.com/qbcore-framework) (cityhall, mechanicjob, ambulancejob, shops, vehiclesales, streetraces, weathersync, spawn and others) | QBCore Framework | GPL-3.0 | Features and default places of the matching ai-* scripts |
| [qbx_* scripts](https://github.com/Qbox-project) (smallresources, garages, vehicles, vehiclekeys, vehicleshop, medical, ambulancejob, bankrobbery, houserobbery, jewelery, storerobbery, truckrobbery, pawnshop, scrapyard, carwash, mechanicjob, newsjob, towjob, diving, fireworks, binoculars, seatbelt) | Qbox Project | GPL-3.0 | Features and default places of the matching ai-* scripts |
| [Discord-Rich-Presence-FiveM](https://github.com/Hjuiihu/Discord-Rich-Presence-FiveM) | Hjuiihu | MIT | Discord Rich Presence setup of `ai-smallresources` (no code taken) |
| [ars_ambulancejob](https://github.com/Arius-Scripts/ars_ambulancejob) | Arius Scripts | Apache-2.0 | Medical layer adapter |
| [pma-voice](https://github.com/AvarianKnight/pma-voice) | AvarianKnight | MIT | API `ai-voice` answers |
| [community_bridge](https://github.com/TheOrderFivem/community_bridge) | The Order | GPL-3.0 | Banking script exports for the banking layer adapters |
| [bob74_ipl](https://github.com/Bob74/bob74_ipl) | Bob74 | MIT | Shipped as is: GTA Online interiors |

Missing someone, or want a line changed? Open an issue or a pull request on [aifivem/aicore-server](https://github.com/aifivem/aicore-server).
