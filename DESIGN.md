# DS Mode — DESIGN.md

The HTML one-pager design system. Token, type, layout, and motion rules
that every generated one-pager — and every template the stamper produces —
must honor.

## Color strategy

**Restrained.** Tinted neutrals + one accent under 5% of the surface.
Never pure `#000` or `#fff`. Every neutral is warm-tinted (warm gray, not
cool gray). The single accent is a muted terracotta — used for the recommended
chip, citation underlines, and the section italic label color. Nowhere else.

## Tokens

```css
:root {
  /* Light palette — warm paper */
  --ink: #2a2622;          /* warm charcoal, never #000 */
  --ink-soft: #6b6660;     /* muted body / captions */
  --ink-faint: #a39d95;    /* very low-emphasis */
  --bg: #faf6ef;           /* cream paper */
  --bg-elevated: #f4eee3;  /* subtle tile tint */
  --rule: rgba(42, 38, 34, 0.14);
  --accent: #b85c2a;       /* terracotta, <5% surface */
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #ece8e0;        /* warm cream, never #fff */
    --ink-soft: #8a8580;
    --ink-faint: #57534c;
    --bg: #181614;         /* warm near-black */
    --bg-elevated: #221f1b;
    --rule: rgba(236, 232, 224, 0.14);
    --accent: #d4844f;     /* lighter terracotta for dark */
  }
}
```

All SVG strokes and fills use `currentColor` (or `fill="none"`). No hardcoded
hex inside `<svg>` ever.

## Typography

Three families, each with a job.

| Role | Stack | Use |
|---|---|---|
| **Display** | `"New York", ui-serif, "Iowan Old Style", Charter, Georgia, serif` | Page title, section labels, body of editorial answers |
| **UI / caption** | `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif` | Tile captions, tags, the `✓ shipped` chip, footer |
| **Mono** | `ui-monospace, "SF Mono", Menlo, monospace` | Inline code only |

Why New York: it's Apple's editorial serif, ships with macOS / iOS, no
download needed. Sized correctly with `font-optical-sizing: auto` it reads
like The Information / Stripe Press, not like Times New Roman.

### Scale

```
Display title:      32–40px, weight 500, letter-spacing -0.015em, line-height 1.1
Display subtitle:   18–20px, weight 400 italic, color var(--ink-soft), line-height 1.4
Section label:      14–15px, weight 500 italic, color var(--accent)
Editorial body:     17–18px, weight 400, line-height 1.55, color var(--ink)
Tile caption:       13–14px, weight 400, line-height 1.5, color var(--ink-soft)
Footer:             11–12px, weight 400, color var(--ink-soft), letter-spacing 0.04em
```

Min step ratio between display and body is 1.6×. No flat scales.

## Layout

- **One concept per page.** If a reply has two real concepts, generate two
  pages — don't cram them.
- **Asymmetric over grid.** Three identical tiles is the SaaS reflex.
  Vary tile sizes, mix a hero with two tiles, or use a single editorial
  block with one inline visual.
- **Hero visual occupies 40–60% of vertical space** when present.
  It earns its size.
- **No bordered cards.** Use whitespace or a subtle `--bg-elevated` tint
  at most. Never a 1px border on a tile.
- **No section-number prefixes** like `1 · TOPIC`. Use italic serif
  lowercase label instead: *"on screenshot cost,"* *"on speed."*
- **Max width 920px.** Generous side gutters.

## Banned patterns (in this register)

These are doctrine breaks for the brand register. Match and refuse.

- **Hero-metric cards.** Big colored number + small label + supporting prose,
  repeated three times across. The SaaS cliché. Replace with editorial prose:
  *"About seven hundred tokens. Half a second to three seconds extra."*
- **Identical card grids of 3 or 4.** Vary the layout.
- **All-caps section headers in the accent color.** Italic serif lowercase
  instead.
- **System font stack alone.** New York or another serif must lead the
  display layer. The system stack is the body-and-caption fallback.
- **Side-stripe borders** on tiles or callouts.
- **Gradient text** or gradient backgrounds.
- **Glassmorphism, neon, glow.**

## Templates

The stamper produces four one-pager templates, each tuned for a reply
intent. All share the tokens and type system above; layout varies.

### 1. `explainer.html`

One concept explained. Hero SVG (~440×260) anchors the page. Two or three
captioned support visuals or editorial paragraphs below. Used for "how
does X work" questions.

### 2. `comparison.html`

Two paths side by side. No hero. Two equal-weight columns. Each column
has a small SVG + title + 2–3 short paragraphs. Used for "should we do
A or B" questions.

### 3. `decision.html`

The chosen path stated plainly + 2–3 option tiles showing what was
considered. The recommended tile is outlined with `--accent` and has a
small `✓ shipped` or `✓ recommended` chip. Used after a decision-point
turn.

### 4. `status.html`

A release note or post-action summary. Single big visual, one or two
editorial paragraphs, no tiles. Used for "what changed" replies.

## Motion

None. These are static print-page artifacts. No transitions, no scroll
behavior, no entrance animations. The page should look the same a year
from now in a screenshot as it does the moment it opens.

## A11y minimums

- Color contrast 4.5:1 minimum for body, 3:1 for large display.
- SVG illustrations carry `role="img"` + `aria-label` describing the
  concept in one sentence.
- Font sizes never below 14px in body, 11px in footnote/footer.
- No information conveyed by color alone (the accent chip always pairs
  with a `✓` glyph).

## File constraints

- One self-contained `.html` file. Inline CSS, inline SVG.
- No `<script>`, no `<link>` to external stylesheets, no `<img>` from
  CDN or web URLs.
- Embed any photo or screenshot as base64 in `<img>` if absolutely
  needed. Default is "no photos."
- Target file size ≤ 30KB.
- Target rendered height ≤ 750px at 1024px wide. Cut content before
  shrinking type below 14px or adding scroll.
