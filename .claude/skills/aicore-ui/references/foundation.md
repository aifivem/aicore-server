# NUI foundation: stack, scale, old CEF

Read before writing any NUI code. Colours, panel looks and the sibling each screen copies: `docs/design.md`.

## Stack

- React 19 + Vite + TypeScript, Redux Toolkit (server data: snapshot + deltas), Tailwind v4 (`@tailwindcss/vite`), shadcn/ui on Radix (`radix-ui`), `motion` (`motion/react`), `fivem-nui-react` (`useNuiEvent`, `fetchNui` with `mockData` for the browser preview). Never mix two motion packages.
- TanStack Router for which screen or tab is open in any NUI with tabs or sub screens: always `createMemoryHistory` (no URL, no F5 in NUI); the browser preview seeds the start address from the hash. Server data stays in Redux, the router holds only the location. Single-screen NUIs (HUD, chat, notifications) have no router.
- Lists: a generic `VirtualList` on `@tanstack/react-virtual` for every scrolling list of data. Debounce/throttle: `@tanstack/react-pacer`.
- Icons: Font Awesome named imports. FA's svg-core injects unlayered CSS that beats Tailwind's size utilities: set `config.autoAddCss = false` before rendering and `@import "@fortawesome/fontawesome-svg-core/styles.css" layer(base);` in the main CSS. Same trap with any hand-written reset: put it in `@layer base`.

## vh scale

- One unit, vh, with `10px = 1vh`. No literal px/rem except a 1px hairline. The `@theme inline` override turns every utility into vh:

```css
@theme inline {
  --spacing: 0.4vh;
  --text-xs: 1.2vh;   --text-xs--line-height: 1.6vh;
  --text-sm: 1.4vh;   --text-sm--line-height: 2vh;
  --text-base: 1.6vh; --text-base--line-height: 2.4vh;
  --text-lg: 1.8vh;   --text-lg--line-height: 2.8vh;
  --text-xl: 2vh;     --text-xl--line-height: 2.8vh;
  --radius-sm: calc(var(--radius) - 0.4vh);
  --radius-md: calc(var(--radius) - 0.2vh);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 0.4vh);
}
:root { --radius: 0.6vh; }
```

- Literal values left in shadcn sources are converted by hand (`-3px` → `-0.3vh`, `h-px` → `h-[0.1vh]`). JS that needs pixels (virtualizer, offsets): `innerHeight / 100 * vh`.
- Hairlines are whole pixels: `0.1vh` is 1.08px at 1080p and CEF drops it on rounded corners; use `1px` for borders that must show.

## Old CEF (Chromium 103) limits

- `backdrop-filter` does not work over the game picture: without a game-view element under the panel, the panel background is opaque. Never animate opacity on a layer holding blur.
- Tailwind v4 split `translate-*` / `scale-*` / `rotate-*` utilities do not work (they use the `translate:` property from Chrome 104): centre with `inset-x-0 mx-auto` or `[transform:translateY(-50%)]`, press with `active:[transform:scale(0.97)]`; motion's `x/y/scale` props are fine. Grep for `\bscale-\d|rotate-\d|translate-[xy]-` before shipping.
- `bg-gradient-*` / `bg-linear-*` utilities emit `in oklab` and drop: use plain colours or `bg-[linear-gradient(...)]`. A gradient followed by a plain colour inside one `bg-[...]` is invalid CSS.
- Tailwind `shadow-*` / `ring-*` come out empty after the postcss chain: use `[box-shadow:...]`.
- oklch / oklab / color-mix need the vite postcss chain (`postcss-oklab-function`, `postcss-color-mix-function`, `postcss-color-functional-notation`, all `{ preserve: false }`, plus the project's `postcss-resolve-color-mix.js` and `postcss-fix-empty-var.js`). Never set `build.target: "chrome103"`.
- No unlayered global rules in `index.css` (they beat utilities): global styles in `@layer base`, custom classes as `@utility`, entry animations as `--animate-*` in `@theme`.
- A keyframe `transform` overrides the element's own transform (a centred element jumps): include the translate in the keyframe or animate an inner wrapper. Do not use shadcn Dialog's `zoom-in-95`.
- A Radix Popover / DismissableLayer opened from an input's `onFocus` closes at once: its document `focusin` listener is added synchronously when the content mounts, inside React's handling of that same native `focusin`, which then bubbles to the document with the input (outside the content) as target. Typing works because no new focus happens. Fix in the popover primitive: `onInteractOutside` calls `preventDefault()` when the target is inside the anchor (ai-core `components/ui/popover.tsx`).
- Radix portals are not hidden by CSS: close them with `open={open && !minimized}`. A `fixed` menu inside a `pointer-events-none` parent inherits it: give it `pointer-events-auto`.
- A child that takes its width from `aspect-square` inside a `w-max` parent counts as 0 width on first layout: give icon buttons a fixed width.
- Variable fonts get a halo in bold: use static weights (`@fontsource/inter/400.css` ... `700.css`) and `font-synthesis: none`.
- Virtual list rows use `Math.round(start)`; fractional translateY blurs text.
- `navigator.clipboard` is blocked: use `copy-to-clipboard`.
- Resource files are root-relative or `https://cfx-nui-<resource>/...`; never build `nui://` URLs.
- The dev server needs `server.fs.allow` to reach the bun store, or fonts 403 in the preview (`.claude/rules/nui.md`).

## Typography

- Body Inter; display font as `docs/design.md` says (uppercase, extrabold, `leading-none`). Sizes: labels 1.2vh (floor), body 1.3-1.4vh, emphasis by weight (400 → 500), not size.
- Tracking: 2.4vh+ `-0.02em`, 1.8-2vh `-0.01em`, body 0, small uppercase labels `+0.04em`. Wrapped text line height at least 1.4. `truncate` with `leading-none` cuts descenders: use `leading-[1.3]`.
- Changing numbers `tabular-nums`; number columns right-aligned. Write texts naturally in the lang file and uppercase them with CSS.
- `user-select: none` at the root; kill the focus outline but keep a visible `focus-visible` ring on buttons and links (inputs show focus on their wrapper with `focus-within`).
- White HUD text without a background: one `drop-shadow(0.15vh 0.1vh 0 rgba(0,0,0,0.75))` on the container.
