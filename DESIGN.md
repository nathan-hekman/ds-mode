# DS Mode — DESIGN.md

The HTML one-pager design system. Token, type, layout, density, and motion
rules every generated one-pager — and every template the stamper produces —
must honor.

## Core principle

**The picture is the answer. Words are labels.**

A twelve-year-old should grok the page from the diagrams alone, with the
words only confirming what the picture already said. If you find yourself
writing a paragraph, you're using the wrong medium — redraw it as a
diagram with a four-word label.

## Color strategy

**Restrained.** Tinted neutrals + one accent under 5% of the surface.
Never pure `#000` or `#fff`. Every neutral is warm-tinted. The single
accent is a muted terracotta — used for the recommended chip, the eyebrow
label, and inline numbers. Nowhere else.

## Tokens

```css
:root {
  /* Light palette — warm paper */
  --ink: #2a2622;
  --ink-soft: #6b6660;
  --ink-faint: #a39d95;
  --bg: #faf6ef;
  --bg-elevated: #f4eee3;
  --rule: rgba(42, 38, 34, 0.14);
  --accent: #b85c2a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #ece8e0;
    --ink-soft: #8a8580;
    --ink-faint: #57534c;
    --bg: #181614;
    --bg-elevated: #221f1b;
    --rule: rgba(236, 232, 224, 0.14);
    --accent: #d4844f;
  }
}
```

When theme is forced via `/ds-mode dark` or `/ds-mode light`, the stamper
strips the `@media` block and hardcodes the chosen palette as `:root`.

All SVG strokes and fills use `currentColor` (or `fill="none"`). No
hardcoded hex inside `<svg>` ever.

## Typography

Three families, each with a job.

| Role | Stack |
|---|---|
| **Display** | `"New York", ui-serif, "Iowan Old Style", Charter, Georgia, serif` |
| **UI / caption** | `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif` |
| **Mono** | `ui-monospace, "SF Mono", Menlo, monospace` |

### Scale

```
Title (display):        32–40px, weight 500, letter-spacing -0.018em, line-height 1.1
Deck (display italic):  17–19px, weight 400 italic, ink-soft, line-height 1.4, ONE SENTENCE
Eyebrow (display ital): 13px, weight 500 italic, --accent, letter-spacing 0.01em
Tile label (display):   14–16px, weight 500, ink, line-height 1.2
Tile caption (UI):      12–13px, weight 400, ink-soft, line-height 1.4
Footer (UI):            11px, weight 400, ink-faint, letter-spacing 0.04em
```

## Density rules — count words

| Element | Word cap | Why |
|---|---|---|
| Title | ≤ 7 words | Headline carries one idea |
| Deck (subtitle) | ≤ 18 words, one sentence | Adds context the title can't |
| Eyebrow | ≤ 4 words | Section label, not a sentence |
| Hero caption | ≤ 10 words | Labels the hero, doesn't explain it |
| Tile label | ≤ 4 words | Names the concept |
| Tile caption | ≤ 12 words, single short line | Glosses the concept |
| Recommended chip | 1–2 words | `✓ shipped`, `✓ recommended` |
| Footer | ≤ 12 words | Identity, not content |

**If you can't fit the meaning under these caps, the diagram isn't doing
its job.** Redraw it. Don't lengthen the words.

## Layout

- **One concept per page.** Two concepts = two pages, or a `comparison`
  template if they're truly a pair.
- **Asymmetric over grid.** Three identical tiles is the SaaS reflex. Vary
  tile sizes, mix a hero with two tiles, or use a single hero with no tiles.
- **Hero visual occupies 40–60% of vertical space.** It earns its size.
- **No bordered cards.** Use whitespace or a subtle `--bg-elevated` tint
  at most. No 1px borders on tiles.
- **No section-number prefixes** like `1 · TOPIC`. Use the italic-serif
  eyebrow instead.
- **Max width 920px** with generous side gutters.

## Banned patterns

Match-and-refuse. Rewrite if you're about to do any of these.

- **Hero-metric cards** (big colored number + small label, repeated).
- **Identical card grids of 3 or 4** with the same icon + heading + body shape.
- **All-caps section headers in the accent color.**
- **System font stack alone** — New York must lead the display layer.
- **Paragraph blocks of prose** in tile bodies. Tiles are 1–2 lines max.
- **Side-stripe borders.** No `border-left: 3px solid var(--accent)`.
- **Gradient text, glassmorphism, neon, glow.**

## Templates

The stamper produces four one-pagers as **starting points**, not mandates.
All share tokens + type + density. Hand-written HTML against the same
tokens is equally valid when a reply needs a layout outside these four
shapes — see the "break-out" guidance in `rules/ds-mode.md`. The
templates exist to make the common case fast, not to lock the system.

### 1. `explainer.html`

How something works. Hero SVG (~440×260) + 1–3 captioned support tiles.
Default for "explain X" answers.

### 2. `comparison.html`

A versus B. Two equal-weight columns, no hero. Each column: SVG (~280×220)
+ label + ≤12-word caption.

### 3. `decision.html`

A choice was made or needs making. One recommended path stated plainly +
2–3 option tiles with the recommended one outlined in `--accent` and
tagged `✓ shipped` or `✓ recommended`.

### 4. `status.html`

Release notes / what-changed. Single hero SVG + 1 short paragraph (≤ 40
words total). No tiles.

## Stencil library

Reusable SVG fragments live in `templates/stencils/`. Claude picks one,
edits the inline labels, doesn't draw from scratch:

- `flow-arrow.svg` — A → B → C horizontal flow with arrows
- `before-after.svg` — two boxes side by side with an arrow between
- `three-bucket.svg` — three labeled containers (lite / full / off, etc.)
- `layered-stack.svg` — three stacked rectangles labeled L1 / L2 / L3
- `sun-moon.svg` — light/dark toggle hero for theme answers

## Motion

None. Static print-page artifacts. No transitions, no entrance animations.

## A11y minimums

- Contrast: ≥ 4.5:1 body, ≥ 3:1 large display.
- Every SVG carries `role="img"` + `aria-label` describing the diagram in
  one sentence (the aria-label CAN be longer than the visible caption —
  it's the screen-reader fallback).
- No information by color alone — the accent chip always pairs with `✓`.

## File constraints

- Single self-contained `.html`. Inline CSS + SVG.
- No `<script>`, no external `<link>`, no `<img>` from CDN.
- Target ≤ 30KB. Target rendered height ≤ 750px at 1024px wide.

## Theme overrides

When `/ds-mode dark` or `/ds-mode light` is set, the stamper hardcodes
that palette and strips the `@media (prefers-color-scheme: dark)` block
so the page ignores OS preference. When `/ds-mode auto` is set (default),
the media query stays. The user can toggle per session.

## Tone overlay (easter egg — surfer)

When `/ds-mode surfer` is active, every label and caption is rewritten in
a chill surfer-bro voice. ELI8 still applies. Zero emoji anywhere — the
voice is the whole easter egg. No exclamation marks, no all-caps.
Captions get shorter, not longer.
