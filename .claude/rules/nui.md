---
paths:
  - "resources/**/web/**"
---

# NUI

Every NUI follows the `tgiann-ui` skill in full (owner decision): stack, vh scale, colour tokens, panel recipes, old-CEF limits, shadcn rules and component catalog, motion, `nui-performance.md`, UX rules and the Apple HIG references. Every screen looks like a TGIANN sibling: `docs/design.md` holds the token block, the display font and which TGIANN UI each screen copies. Transport and React architecture: `tgiann-fivem-dev` `references/nui.md`.

## Stack (every ai-* NUI)

- React 19 + Vite + TypeScript, Tailwind v4 with the vh `@theme inline` override (`10px = 1vh`) and the CEF 103 postcss chain.
- shadcn/ui on Radix (`radix-ui` package): every control Radix has (Slider, Tabs, ScrollArea, Tooltip, Dialog, Popover, DropdownMenu, Select, Switch, ToggleGroup...) lives in `web/src/components/ui/<name>.tsx`, re-skinned with the TGIANN tokens in vh; never hand-written. `cn()` (clsx + tailwind-merge) and class-variance-authority for variants.
- TanStack: Router (`@tanstack/react-router`, `createMemoryHistory`, preview seeded from the hash) for which screen or tab is open in any NUI with tabs or sub screens; Virtual (`@tanstack/react-virtual`, a `VirtualList`) for every scrolling list of data; Pacer (`@tanstack/react-pacer`) for throttle and debounce.
- Redux Toolkit for the screen's data (snapshot + deltas); the router holds only the location.
- `motion` (`motion/react`): springs with bounce 0, durations from `motion.md`, one sliding selection indicator.
- Transport `fivem-nui-react` (`useNuiEvent`, `fetchNui` with `mockData` for the browser preview); no hand-written message listeners or `fetch` calls.
- Icons: Font Awesome named imports (`config.autoAddCss = false`, svg-core CSS in `@layer base`).
- A package outside this list needs the owner's yes.

## Look and behaviour

- Colours, surfaces and component looks: `docs/design.md` and the TGIANN reference pictures in `docs/design/tgiann/`. Tokens are CSS variables in the NUI's `index.css`, used through Tailwind theme colours; never a raw hex that has a token.
- Behaviour from `tgiann-ui`: `ux-rules.md` (one primary action, hit targets at least 2.8vh, hover/active/focus-visible on everything interactive, Escape closes the last opened layer, empty/loading/error states), `motion.md` (150 ms hover and press, 200-300 ms enters, exits shorter, interruptible), `apple-hig/` for interaction questions and the eight-principle review vocabulary.
- When the screen mirrors something GTA has (creator, shops, barber), copy the closest TGIANN sibling UI first (catalog in `tgiann-ui` `components.md`, `[encrypted]` nonbuild folders), then reskin.
- Texts come from the resource's lang file (sent with the screen's open message), never literals; buttons start with a verb.
- A screen loads one snapshot and applies deltas; no polling, no refetch after an action.
- `web/vite.config.ts` `server.fs.allow` lists `".."` and `"../../../../node_modules"`: bun hoists packages (fonts) to the workspace root, and without it the browser preview gets 403 on the font files and screenshots render in a system font (the build is not affected).
- Before reporting, run the `ux-rules.md` delivery checklist and verify with a browser screenshot (`bun run webdev`, headless Edge or puppeteer, presets in `web/src/dev/preview.ts`).
