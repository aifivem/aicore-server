# NUI performance and motion on FiveM's shared renderer

Read before writing any animation, timer or loop in a NUI, or when a NUI stutters.

## Why NUIs stutter

- FiveM runs every resource's `ui_page` as an iframe of one root page: **all NUIs of the server share one renderer process and one main thread**. A HUD or inventory doing work in a frame takes that frame from every other NUI.
- The root browser renders at 240 fps (about 4 ms per frame for everyone).
- CEF is Chromium 103: no CSS `linear()` easing, no individual `scale` / `rotate` / `translate` properties, no View Transitions, no ScrollTimeline; `clip-path` animations are not composited.
- Only the compositor thread keeps running while the main thread is busy. WAAPI on `transform` / `opacity` with a tween stays smooth; Motion springs, `x`/`y`/`scale` shorthand, motion values and rAF loops are main-thread work.

## Rules

1. Full-screen and frequent moves run on the compositor: literal `transform` (and `opacity`) targets with a tween. Never `type: "spring"` for them (in CEF it runs in JS).
2. Springs become `glide(response, bounce)`: the spring fitted to a cubic-bezier tween (table below).
3. One transform function list per element: every state writes the same functions in the same order.
4. Drag and compositor move never share an element: the enter/exit slide on an outer wrapper, the drag offset on an inner element. Gesture releases that carry velocity keep a JS spring.
5. No animated `clip-path` on large layers.
6. Nothing works while hidden: a closed panel runs no timers, rAF loops or DOM measurements.
7. No `content-visibility: hidden`: DOM reads inside it print warnings to every player's F8 console. Hidden trees use `visibility: hidden`.
8. `[contain:layout_paint]` on clipped full-screen containers (not on elements whose shadow paints outside).
9. Small hover/press colour transitions stay CSS.

## `glide` curves

Duration = `response × settle`.

| bounce | settle / response | cubic-bezier |
|---|---|---|
| 0 | 1.182 | 0.22, 0.189, 0.141, 1.034 |
| 0.05 | 1.028 | 0.23, 0.153, 0.179, 1.011 |
| 0.1 | 0.871 | 0.229, 0.098, 0.248, 0.985 |
| 0.15 | 1.077 | 0.239, 0.18, 0.164, 1.145 |
| 0.2 | 1.148 | 0.262, 0.263, 0.128, 1.198 |
| 0.3 | 1.112 | 0.293, 0.325, 0.123, 1.281 |

```ts
const glide = (response: number, bounce = 0): Transition => {
  let best = GLIDE_CURVES[0];
  for (const c of GLIDE_CURVES) if (Math.abs(c[0] - bounce) < Math.abs(best[0] - bounce)) best = c;
  return { type: "tween", duration: response * best[1], ease: best[2] };
};
```

Typical values: push 0.45/0, sheet and modal 0.5/0, alert 0.3/0, menu 0.35/0.2, pop 0.35/0.3, toast 0.45/0.25.

## Motion feel

- Bounce 0 by default; hover and press 150 ms; enters 200-300 ms; exits shorter and along the same path; feedback on pointer-down; never lock input during a transition; one sliding selection indicator per group.
- Push: `initial={{ transform: "translateX(100%)" }} animate={{ transform: "translateX(0%)" }} exit={{ transform: "translateX(100%)" }} transition={glide(0.45)}`.
- Pop / menu: `{ opacity: 0, transform: "scale(0.6)" }` → `{ opacity: 1, transform: "scale(1)" }`, exit as a short tween. A centred element keeps its translate inside the same string: `"translate(-50%, -50%) scale(0)"`.
- Pixel moves stay pixels on both ends, `%` stays `%`.
- Do not use `layout` / `layoutId` on big elements (small tab pills are fine).

## Loops, measurements, images

- DOM reads that follow an animation run in Motion's read phase for a short window; never an endless rAF loop.
- WebGL loops: no `gl.finish()`, cap fps, stop when hidden, cancel on unmount.
- Images: `decoding="async"`, `loading="lazy"` off screen, sized close to their display size.

## Headless screenshots

- Headless Edge (`--headless=new --virtual-time-budget=<ms> --screenshot`) can freeze `motion` animations that start after a `delay` (or late on a slow first dev-server compile): the element stays at `opacity: 0` in the shot. Check with `--dump-dom` before judging a blank picture; a production build opened from `file://` captures reliably (ai-loading), the vite dev server of a large page (the admin panel) often does not within the budget.
