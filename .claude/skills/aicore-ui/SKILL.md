---
name: aicore-ui
description: NUI work on ai-core - the React/Vite/Tailwind/shadcn stack, the vh scale, FiveM's old CEF (Chromium 103) limits, shared-renderer performance, motion, UX rules and the delivery checklist. Use for every NUI screen, HUD, menu, panel, dialog or style change in an ai-* resource's web/ folder, and for UI reviews.
---

# ai-core NUI

Every ai-* NUI looks like a sibling of the others. Colours, fonts, panel recipes, components and which reference picture each screen copies are in `docs/design.md` (pictures in `docs/design/tgiann/`); the stack and behaviour rules are in `.claude/rules/nui.md`. This skill holds the technical knowledge behind them.

## Non-negotiables

- vh units through the `@theme inline` override (`10px = 1vh`), one accent colour used only as accent, Font Awesome icons.
- CEF 103 limits beat modern CSS: no `backdrop-filter` without a game view underneath, no split `translate-*/scale-*/rotate-*` utilities, no Tailwind `shadow-*/ring-*`, no `bg-linear-*`, no animated opacity on blurred layers.
- All NUIs share one renderer main thread: full-screen and frequent moves are compositor tweens (`glide` + literal `transform`/`opacity`); nothing animates or measures while hidden.
- Every scrolling list is a `VirtualList`; every list and panel has empty, loading and error states.
- Live data: one snapshot, then the server's deltas applied to the store; never polling or refetching after an action.
- Texts from the lang file, English, no em dash; buttons start with a verb.

## References

| File | Read when |
|---|---|
| `references/foundation.md` | Every NUI task: stack, vh scale, CEF limits, typography |
| `references/performance.md` | Any animation, timer, loop or "it stutters"; motion durations and `glide` |
| `references/ux.md` | Layout, states, focus and keyboard, forms, copy, navigation, review vocabulary, delivery checklist |

## Workflow

1. Find the screen's sibling in `docs/design.md` and its reference picture; take sizes from there.
2. Build with shadcn/Radix components re-skinned with the token block (`docs/design.md`), never hand-written controls Radix already has.
3. Layout, states and copy from `references/ux.md`; motion only where it carries meaning (`references/performance.md`).
4. Build the web project (`bun run build` in the resource; the game only reads `dist/web`), then check it in the browser preview (`bun run webdev`, mock data in `web/src/dev/`) or in game, and run the delivery checklist.
