# Design language: TGIANN

Every ai-core screen looks like a sibling of the TGIANN store scripts (owner decision). The `tgiann-ui` skill applies in full: stack, vh scale, colour tokens, panel recipes, old-CEF limits, motion, performance, UX rules, Apple HIG. This file only adds what is specific to ai-core: the token block every NUI pastes, the heading font, and which TGIANN UI each ai-* screen copies.

Reference pictures: `docs/design/tgiann/*.png` (the TGIANN live demos; ignore their "DEMO MENU" / "LIVE DEMO" side panel, it is demo only). Source of each sibling: `C:\TGIANN\FivemServers\esx_test\txData\ESXLegacy_74F21A.base\resources\[tgiann]\[encrypted]\tgiann-<name>-nonbuild` (read it for measurements, never copy a whole file).

## Look in one paragraph

Neutral near-black surfaces (no blue tint), white text with white-alpha secondary text, hairlines in white at 4-10 % alpha, one accent green `#36ff9f` used only as accent. Screen titles are huge, heavy, wide uppercase words (the display font). Primary actions are filled green with dark `#333` text and bold label; icon actions are round buttons. Full-screen screens float directly over the game (blurred by Lua, light CSS scrim), panels over gameplay are solid `rgba(14,14,14,0.95)` with radius 1.4vh. No outlined green buttons, no wide-letter-spaced captions, no blue-grey charcoal.

## Token block (every `web/src/index.css`)

```css
@import "@fontsource/unbounded/800.css";

:root {
  --green: #36ff9f;
  --green-hover: #2bcc7f;
  --green-text: #333333;
  --tgi-green-rgb: 54, 255, 159;
  --green-10: rgba(54, 255, 159, 0.1);
  --green-15: rgba(54, 255, 159, 0.15);
  --green-20: rgba(54, 255, 159, 0.2);
  --green-30: rgba(54, 255, 159, 0.3);
  --green-40: rgba(54, 255, 159, 0.4);
  --green-60: rgba(54, 255, 159, 0.6);
  --radius: 0.6vh;
}

@theme inline {
  --font-sans: "Inter", sans-serif;
  --font-display: "Unbounded", "Inter", sans-serif;
  --color-tgi-green: var(--green);
  --color-tgi-green-hover: var(--green-hover);
  --color-tgi-green-text: var(--green-text);
  --color-tgi-green-10: var(--green-10);
  --color-tgi-green-15: var(--green-15);
  --color-tgi-green-20: var(--green-20);
  --color-tgi-green-30: var(--green-30);
  --color-tgi-green-40: var(--green-40);
  --color-tgi-green-60: var(--green-60);
  --color-panel: rgba(14, 14, 14, 0.95);
  --color-page: #0e0e0e;
  --color-header: #141414;
  --color-surface: #181818;
  --color-float: #161616;
  --color-row: #111111;
  --color-control: #222222;
  --color-control-hover: #333333;
  --color-line: rgba(255, 255, 255, 0.04);
  --color-line-strong: rgba(255, 255, 255, 0.1);
  --color-text: #ffffff;
  --color-text-2: rgba(255, 255, 255, 0.8);
  --color-text-3: rgba(255, 255, 255, 0.5);
  --color-text-4: rgba(255, 255, 255, 0.22);
  --color-danger: #f87171;
  --color-danger-solid: #ef4444;
  --color-danger-bg: rgba(239, 68, 68, 0.15);
  --color-warn: #f5b742;
  /* plus the vh scale block from tgiann-ui foundation.md */
}
```

Base layer as in tgiann-multichar `src/index.css`: `*` border colour `rgba(255,255,255,0.1)`, focus ring `box-shadow: 0 0 0 0.2vh var(--green-60)`, `:where(.uppercase:not(.font-display)) { letter-spacing: 0.04em }`, scrollbar thumb `#333333` round, `scroll-fade-*` utilities. A tinted accent surface is `bg-tgi-green-10/15`, never `bg-tgi-green/10` or a literal `rgba(54,255,159,…)`.

## Typography

- Body Inter 400/500/600/700. Display font Unbounded 800 (`font-display`, OFL, stands in for TGIANN's Agrandir: owner decision, Agrandir's licence does not allow shipping it in a public repo), always uppercase, `leading-none`, tracking `-0.01em`.
- Screen title (top left of a full-screen screen: INVENTORY, CHOOSE CHARACTER) `font-display text-[4.4vh]`, one line of `text-[1.6vh] text-text-2` under it. Panel title (bank "FLEECA BANK", garage "My Vehicles") `font-display text-[1.6vh]`. Section label `text-[1.2vh] uppercase font-semibold text-text-3` (tracking from the base rule, no wide spacing).
- Values `tabular-nums`; money green only where it is the player's own balance (HUD, bank).

## Components

- **Primary button:** `bg-tgi-green text-tgi-green-text font-bold hover:bg-tgi-green-hover rounded-full` (big screen action: PLAY `h-[5.2vh] px-[3vh]`; panel action `h-[3.6vh]`) with an icon before the label. One per view.
- **Secondary / grey button:** `bg-control hover:bg-control-hover text-white` or `bg-white/6 text-text-3 hover:bg-white/12 hover:text-white`, same shape.
- **Destructive:** confirm action `bg-danger-solid text-white`, otherwise chip `bg-danger-bg text-danger`.
- **Icon button:** round `size-[4.4vh] rounded-full bg-[#00000099] text-[#FFFFFFB2] hover:bg-[#101010B3] hover:text-white` over the game, `bg-control` inside a panel. Close is an icon button top right with "ESC to close" text before it on full-screen screens.
- **Labels on controls (owner decision):** tabs, category bars and filters show icon + label; an icon alone is only for close (door), the round mic/status circles of the HUD, and filters on a grid too narrow for labels (then a tooltip). Icon-only rows read as an empty screen.
- **Header tabs** (bank header): row of equal-width `h-[4vh] w-[12.4vh] rounded-[0.8vh] bg-control` tabs with icon + label, the active one `bg-tgi-green text-tgi-green-text` (one sliding green pill). **Category pills over the game** (vehicleshop, appearance column): `h-[3.8vh] rounded-full bg-black/60 border-white/10` icon + label (+ count), active `border-tgi-green bg-tgi-green-10`. **Text tabs:** label + icon, active `text-white` with a 0.2vh green underline, others `text-text-3`.
- **Card / row:** `bg-white/3 border border-white/8 rounded-[1vh]`; hover `bg-white/6`; selected `border-tgi-green bg-tgi-green-10`. List rows in a solid panel: `bg-row` or `bg-surface`, `rounded-[0.8vh]`, `h-[4.8vh]`.
- **Input / search:** pill `rounded-full bg-[#2222224D] border border-white/8 h-[3.6vh] px-[1.4vh]`, icon on the right, focus via `focus-within:border-tgi-green-40`.
- **Toggle:** green track when on, `bg-control` off, white knob.
- **Status chip:** `rounded-[0.4vh] px-[0.6vh] text-[1.1vh] font-bold uppercase`: green `bg-tgi-green text-tgi-green-text`, red `bg-danger-bg text-danger`, info `bg-[#3b82f626] text-[#60a5fa]`.
- **Icon badge:** `size-[3.6vh] rounded-full bg-tgi-green-10 text-tgi-green`.
- **HUD pieces** (lumihud): dark pills `bg-[rgba(19,19,19,0.75)] rounded-full`, round icon circles, thin bars with value, white text with `drop-shadow(0.15vh 0.1vh 0 rgba(0,0,0,0.75))` where there is no pill. Voice: a mic circle whose icon fills up to the range (green while talking, walkie-talkie on the radio) + bold range name and light "RANGE" text; no bar meters. Top right: job chip (green on duty) + grade chip + "[id] Firstname Lastname" above the money.

## Panels

- **Full-screen screen** (inventory, character select, appearance, shop catalogue): no outer panel; the game shows through with a light CSS scrim (`bg-[radial-gradient(...)]` 0.5-0.8 at the edges), blurred in Lua (`TriggerScreenblurFadeIn(250)` while open, `FadeOut` on close and resource stop) unless the screen's subject stands in the world (appearance ped, showroom vehicle). Title block top left, ESC + close top right.
- **Solid panel** (bank, garage, scoreboard, admin): `bg-panel rounded-[1.4vh]` with a header row (display title left, icon tabs centre, close right), body cards on `bg-surface` / `bg-row`.
- **Centered settings panel / dialog:** tgiann-ui recipe (c).
- Pictures behind full-screen menus that are not over gameplay (character select, loading) stay in ai-core `web/public/backgrounds/`.

## Sibling per screen

| ai-* screen | Copy from (`docs/design/tgiann/`, `tgiann-<name>-nonbuild`) |
|---|---|
| ai-core character select | `multichar.png`, tgiann-multichar |
| ai-core context menu, input, progress, notify, prompts | tgiann-core (tgiann-core-nonbuild), `radialmenu.png` for the menu list look |
| ai-core admin panel | tgiann-core admin lib (tgiann-core-nonbuild admin panel) |
| ai-inventory | `inventory.png`, tgiann-inventory |
| ai-appearance | `clothing.png`, tgiann-clothing |
| ai-banking | `bank.png`, tgiann-bank |
| ai-garages | `realparking.png`, tgiann-realparking |
| ai-vehicleshop | `vehicleshop.png`, tgiann-vehicleshop |
| ai-chat | `chat.png`, tgiann-chat |
| ai-hud | `lumihud.png`, tgiann-lumihud |
| ai-radialmenu, ai-target | `radialmenu.png`, tgiann-radialmenu-target |
| ai-scoreboard | `esc-menu.png`, tgiann-esc / tgiann-leaderboard |
| ai-death | tgiann-core / lumihud text styles (big display title, round icon buttons) |
