# Design language: Dark Minimal

The visual system of every ai-core screen (owner decision). Reference: `docs/design/dark-minimal-reference.jpg` (character select, pause menu, settings, notifications, HUD). Follow the reference as the source of truth for any new screen: same charcoal surfaces, one restrained green accent, the same typography, spacing, borders and components. Keep the interface readable during gameplay; no unnecessary panels or decoration, no heavy blur, glass effects or glow.

This file replaces only the `tgiann-ui` skill's colour tokens and panel looks. Everything else comes from the skill (owner decision): the stack (shadcn/Radix components re-skinned with these tokens, TanStack Router / Virtual / Pacer, Redux Toolkit, motion, fivem-nui-react; `.claude/rules/nui.md`), vh scale, old-CEF limits, hairlines in whole pixels, motion, performance, UX rules and the Apple HIG references.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0E10` | Page / full-screen background, behind panels |
| `--panel` | `#111619` | Panels, cards, notifications, nav |
| `--panel-raised` | `#161C1F` | Hover, active nav row, inputs, slider track |
| `--line` | `#252D30` | Borders (1px hairline), dividers |
| `--accent` | `#36FF9F` | Primary actions, selection, active states, positive values |
| `--accent-text` | `#0B0E10` | Text on a filled accent |
| `--text` | `#FFFFFF` | Titles, values |
| `--text-2` | `#C9D1D3` | Body text |
| `--text-3` | `#7D8A8E` | Labels, hints, timestamps |
| `--danger` | `#F04A4A` | Destructive actions, errors |
| `--warn` | `#F5B742` | Warnings |

- Radius: panels 1vh, cards 1vh, buttons and inputs 0.6vh, chips full.
- Borders are always a 1px `--line` hairline (whole pixels: `0.1vh` is 1.08px at 1080p and CEF drops it on rounded corners); the selected card swaps it for `--accent` plus a faint accent tint and a soft glow (`box-shadow: 0 0 2.4vh rgba(54,255,159,0.18)`), nothing stronger.
- No backdrop blur. Over a background image a panel stays opaque (`--panel` at 0.92-0.96 alpha at most).

## Typography

- Inter (400/500/600/700). Sizes: label 1.2vh, body 1.3-1.4vh, card title 1.8vh, panel title 2.2vh, numbers in the HUD 2-3.2vh.
- Section captions (above a block, like "SETTINGS MENU" in the reference) are 1.2vh uppercase, letter-spacing 0.24em, `--text-3`.
- The server brand (top left of full-screen screens): name 2.6vh, 600, letter-spacing 0.3em uppercase, subtitle 1.1vh letter-spacing 0.5em `--text-3`, a small accent icon before it.
- Numbers use `tabular-nums`; money in `--accent` only where it is the player's own balance on the HUD.

## Components

- **Primary button:** outline style: `--panel` fill, 1px `--accent` border, `--accent` text, 600; hover fills `rgba(54,255,159,0.12)`. A filled accent button only for the single most important action of a dialog.
- **Secondary button:** 1px `--line` border, `--text-2` text; hover `--panel-raised`.
- **Destructive button:** 1px border `rgba(240,74,74,0.6)`, `--danger` text; hover `rgba(240,74,74,0.12)`.
- **Card (character select):** tall card, image area on top (character portrait or silhouette), name 1.8vh 600, two info rows with icon (`--text-3` icon, `--text-2` text), primary button full width, then secondary + destructive side by side. The "create" card is a dashed `--line` outline with a large thin `+` and two lines of text.
- **Navigation (menus):** left column on `--panel`, brand at the top, rows with icon + label; the active row has `--panel-raised` fill, a 0.3vh accent bar on the left and an accent icon. Footer: small status (server online dot, player count, version) in `--text-3`.
- **Content panel:** title 2.2vh + one-line description in `--text-3`, then cards on `--panel` with `--line` borders. Key/value rows: icon + label left (`--text-3`/`--text-2`), value right (`--text`), accent for the highlighted value.
- **Tabs:** a row of equal cells inside a `--line` frame; the active cell has `--accent` text/icon and a 0.2vh accent underline.
- **Slider:** 0.6vh track `--panel-raised`, accent fill, white round thumb, value right in `--text-2`.
- **Toggle:** pill 4.2 x 2.4vh, on = accent fill with white knob, off = `--panel-raised` with grey knob.
- **Notification:** `--panel` card, 0.4vh coloured bar on the left (accent success, danger error, warn warning), round icon in the same colour, title 1.4vh 600, body 1.25vh `--text-3`, remaining seconds top right.
- **HUD:** minimap bottom left with street name next to it; status items bottom centre (round icon in a thin ring coloured by meaning, value above a label); money top right (cash in accent, bank in `--text`); speedometer bottom right (thin arc, large number, unit, gear, fuel bar). Nothing else stays on screen while playing.

## Backgrounds

- Full-screen menus that are not over gameplay (character select, loading) use a night Los Santos image, darkened towards the panels: `web/public/backgrounds/skyline.jpg`, `wet-drive.jpg` in ai-core. The image never competes with text: a dark gradient over the side that holds content.
- Screens over gameplay (pause menu, settings, notifications, HUD) have no background image; panels sit on the live game.
