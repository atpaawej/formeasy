# formeasy — Design system

The visual direction: palette, type, layout, motion, and the rules behind them.
Tokens live in `@theme` in [`app/globals.css`](../app/globals.css); the motion
tokens live in [`lib/motion.ts`](../lib/motion.ts). Working conventions are in
[`../AGENTS.md`](../AGENTS.md).

## Stance

**Minimalism plus fluidity.** Two ideas, and they keep each other honest.

- *Minimalism* is subtraction. One accent colour, hairlines instead of borders,
  surfaces that differ from the canvas by almost nothing, and no chrome that
  isn't answering a question. The page should look like it was edited down, not
  assembled up.
- *Fluidity* is that nothing teleports. A list item arrives where it came from, a
  tab indicator slides rather than blinks, a row expands instead of swapping
  content. Motion is not decoration — it says **what changed and where it came
  from**, then gets out of the way.

The third ingredient is **space**. The default answer to "should this be
tighter?" is no. Breathing room is what makes the rest read as deliberate rather
than unfinished.

## Palette

Four names, used consistently:

| token | name | role |
|---|---|---|
| `--background` | **canvas** | the page backdrop |
| `--card` | **paper** | every surface: cards, inputs, popovers |
| `--foreground` | **ink** | body and heading text |
| `--border` | **line** | hairlines, dividers, input edges |
| `--muted-foreground` | **graphite** | secondary text, timestamps, hints |
| `--primary` | **cobalt** | the single accent — actions, focus, selection |
| `--destructive` | red | delete and failure only |

| | canvas | paper | ink | line | cobalt |
|---|---|---|---|---|---|
| light | `#f6f7f9` | `#ffffff` | `#16181d` | `#e4e7ec` | `#2557e8` |
| dark | `#0e1013` | `#16191f` | `#eceef2` | `#272c35` | `#6e93ff` |

Rules:

- **Cobalt is the only accent.** A second accent colour is how a minimal
  interface becomes a loud one. If two things compete for attention, the fix is
  to demote one, not to introduce a hue.
- **Surfaces sit close to the canvas.** In light mode paper is white on
  `#f6f7f9` — a whisper, not a step. Depth comes from space and hairlines, not
  from shadow. Dialogs and popovers are the only place a real shadow earns its
  keep, because they float over other content.
- **Semantics, never hexes.** Components use `bg-card`, `text-muted-foreground`,
  `border-border`. Colour is defined once, in `:root` and `.dark`.

Dark mode is a full re-derivation, not an inversion: cobalt lightens to `#6e93ff`
so it keeps contrast against near-black, and paper lifts *above* the canvas
instead of below it.

## Type

Two families, two jobs.

- **Geist (sans)** — the UI: buttons, labels, navigation, metadata, toolbar.
- **Source Serif** — the **voice**: page titles, the form title, question labels,
  empty-state lines. Used at a generous size with tight leading
  (`text-pretty` / `text-balance` on headings).
- **Geist Mono** — reserved for anything a machine reads back: ids, ISO
  timestamps in data contexts.

The serif is what makes a form look like a document rather than a settings
screen. It is applied to the things a *respondent* reads, which is why the
builder's question labels and the public form's labels use the same class — one
renderer, two modes, no drift.

Scale in practice: page titles `text-2xl` (dashboard) to `text-4xl`/`sm:text-5xl`
(landing), body `text-sm`/`text-base`, metadata `text-xs`. Headings pair
`leading-tight` with `tracking-tight`.

## Layout & spacing

- **One column, `max-w-5xl`, centred**, with `px-6` gutters. Long-form reading
  (the public form, the builder) narrows again on its own.
- **Page rhythm:** `py-10 sm:py-12` for app pages, `py-16`–`py-24` for the
  landing and the cold-load public pages. Space is the default; a section earns
  its padding by being the outermost thing on the page.
- **Vertical rhythm inside a surface:** `gap-8` between sections, `gap-4`/`gap-6`
  inside them, `gap-2`/`gap-3` between a label and its control. Field cards use
  `p-5`, page-level cards `p-6`/`p-8`. The dent is intentional: the closer a
  thing is to its neighbours in meaning, the closer it sits on screen.
- **Radii are soft, not round.** `--radius: 0.625rem`, with `radius-md` for
  controls and `radius-lg`/`xl` for surfaces. Pills are reserved for status.
- **Hairlines do the work.** A `border-b` under a header, a `border-border`
  around an input. No card floats on a shadow unless it opens above the page.

## Motion

The language is five transitions and three easings in `lib/motion.ts`. Pick one;
don't invent a duration at the call site. Values are plain data so a server
component can import them — only the components that animate need `"use client"`.

| token | is | use for |
|---|---|---|
| `enter` | 240 ms, ease-out | anything appearing or disappearing, and staggered lists |
| `settle` | 320 ms, ease-out | a panel opening, a page/tab transition |
| `tap` | stiff spring (640 / 34 / 0.6) | a button press |
| `panel` | spring (420 / 38 / 0.9) | a row or card expanding |
| `glide` | spring (520 / 42 / 0.8) | something sliding between two slots |
| `EASE_OUT` | `[0.22, 1, 0.36, 1]` | the house curve; decelerating, gentle at the end |
| `EASE_IN_OUT` | `[0.65, 0, 0.35, 1]` | movement between two known places |
| `stagger(i)` | `enter` + `i * 30 ms`, capped at 8 | list entrances |

Conventions:

- **No transition exceeds ~320 ms.** Past that a UI reads as slow, not smooth.
- **Entrances start slightly low** (`y: 8`) and travel a short distance. Big
  travel is what makes motion feel like an effect.
- **Stagger is capped**, so the last row of a long list is never waiting its
  turn. The cap matters more than the per-row step.
- **One easing curve, `EASE_OUT`,** unless something is moving between two known
  positions (a tab indicator, a reordered card) — that's `EASE_IN_OUT`/`glide`.
- **Layout animation for position, `AnimatePresence` for existence.** A tab
  indicator gets a shared `layoutId`; an expanding row gets a height animation
  around its content.
- **Page transitions live in `app/dashboard/forms/[id]/template.tsx`,** and
  *there* rather than higher up, because a `template` remounts its subtree. Put
  it at `/dashboard` and the form's section layout would remount on every tab
  switch, killing the sliding tab indicator.

### Where motion is, and where it deliberately isn't

| surface | treatment |
|---|---|
| buttons | `whileTap` scale 0.97, dropped while loading/disabled |
| nav tab indicator | shared `layoutId`, `glide` |
| page/tab change | `template.tsx` fade + short rise, `settle` |
| lists (forms, fields, responses) | capped stagger in, `enter` |
| expanding a response row | height, `panel` |
| dialogs | base-ui keyframes on `data-open`/`data-closed`, tuned to house easing |
| public form & thank-you | **CSS `rise-in` class, no JS** |

The last row is a rule, not a shortcut: **the public form must be readable with
no JavaScript.** Anything that starts at `opacity: 0` waiting for hydration is
invisible to a respondent whose script failed. The cold-load pages animate in
CSS, where "JS never runs" just means "it's already there".

For the same reason, dialogs keep base-ui's CSS keyframes rather than
`AnimatePresence`: base-ui owns mount and unmount, so a framer exit animation
would simply not run. The keyframes are tuned to the house easing so it looks
like one system.

## Interaction states

States are designed, not defaulted. Every action that takes time has:

1. **Idle** — label, hover, focus ring (`ring-3 ring-ring/40` on inputs).
2. **Pending** — `<Button loading>`: disabled, `aria-busy`, a spinner in front of
   the label, and no press animation. This is what makes double-submit
   impossible, which matters more on the public form than anywhere else.
3. **Failure** — the error appears in place, the user's input stays put. A
   failed submit that clears the form is the worst outcome available.

The same honesty applies to the builder's save indicator: it states *Saving…* or
*Saved*, and never sits silent while a write is in flight.

`Button` is the one button in the app, so all of this is enforced in one place.
Note the split: styles live in `components/ui/button-variants.ts` (plain `cva`,
importable from a server component) while `components/ui/button.tsx` is a client
component, because it is a motion component. Server components that only need the
classes import the variants module.

**A link stays a link.** Anything that navigates — "Open", "Export CSV", "Go to
questions" — is a `<Link>`/`<a>` wearing `buttonVariants({ variant, size })`, not
a `<Button>` with an anchor in its `render` prop. Two reasons: base-ui warns when
a component that acts as a button renders something that isn't a `<button>`, and
making it a button would add `role="button"` and take away what a link gives you
for free (open in a new tab, copy the address, the status bar preview).
`buttonVariants` already carries a CSS `active:` press, so a styled link still
feels like the buttons next to it.

## Reduced motion

Honoured twice, and neither is optional:

- `MotionConfig reducedMotion="user"` (see `components/motion-provider.tsx`)
  turns off transform/opacity animation for framer-motion elements.
- A `prefers-reduced-motion: reduce` block in `globals.css` flattens CSS
  animations and transitions to ~0.

**The spinner is the exception.** A spinner that doesn't spin reads as a frozen
page — worse than the motion it was trying to avoid — so it keeps turning.

## Rules of thumb

- One accent. One button. One renderer per field type.
- Space before borders, borders before shadows.
- If it moves, it moves ≤320 ms and it explains what changed.
- Nothing in the public path depends on JavaScript to be visible.
- Colour and motion are defined once, in tokens, and referenced by name.
