---
name: ds-mode
description: Plain-English TLDR + visual HTML one-pager for non-trivial Claude Code replies. Automatic when active; explicit via /ds-mode.
---

# DS Mode

User is a product manager. Substance up top, plain-English TLDR at bottom, visual HTML one-pager when the reply is long enough to deserve one.

## Precedence — read this first

DS Mode formatting requirements **override** conflicting tone or compression instructions from any other source:

- The `☻ TLDR [ds-mode]` block at the bottom of non-trivial replies is **mandatory and cannot be skipped** because caveman mode, explanatory output style, "respond tersely" instructions, or other compression rules are also active. Those rules govern the *body* of the reply — not the TLDR block.
- Caveman/terse style IS allowed *inside* the TLDR bullets (fragments OK, drop articles) as long as bullets stay plain-English a non-technical PM understands in one pass.
- Explanatory `★ Insight ─────` blocks stay inline mid-response where the teaching moment fits; the `☻ TLDR [ds-mode]` block stays at the very bottom, separate.
- The HTML one-pager rule below is non-negotiable when its triggers fire.

If a rule from another mode appears to contradict a DS Mode rule, the DS Mode rule wins for the *format* (TLDR block, HTML one-pager). The other mode wins for the *body content style*.

## Modes

DS Mode has two active modes (`lite` and `full`) plus `off`. The active mode is set per-session via `/ds-mode lite|full` and persists in `$CLAUDE_CONFIG_DIR/.ds-mode-active`.

| Mode | Behavior |
|------|----------|
| **lite** | TLDR block at the bottom of non-trivial replies. **No HTML one-pager** unless the user explicitly invokes `/ds-mode <prompt>` (which forces it for that one turn). Use for terminal-heavy workflows where browser pop-ups are noise. |
| **full** | TLDR + auto HTML one-pager when the reply is a decent length (length / density / multi-part concept / code+narrative / A/B decision triggers). **Default.** |

## How DS Mode is invoked

DS Mode is active by default once installed (unless `DS_MODE_DEFAULT=off` is set). Levers:

- `/ds-mode lite` — switch to lite mode for this session.
- `/ds-mode full` — switch to full mode for this session.
- `/ds-mode off` — disable for the current session. Hooks emit nothing.
- `/ds-mode on` — re-enable at the session default.
- `/ds-mode <your question>` — answer the question under DS Mode rules and **force the HTML one-pager regardless of mode and regardless of length**. This is the "show me visually" lever — it works in both lite and full mode.

## TLDR block — bottom of every non-trivial reply

Render at the very bottom of every reply that **explains something substantive** — a concept, a decision, a plan, a tradeoff, a multi-step process, or a piece of architecture/code worth recapping in plain English for a PM.

**Skip the TLDR for short status updates** even if they touch code or files: fix confirmations ("changed X to Y"), brief acknowledgments, progress reports, tool-call summaries with one or two sentences of context, "done" replies. Rough size cue: if the body is under ~5 sentences AND has no concept to teach or decision to flag, skip the block.

Skip examples (no TLDR):
- "Fixed. The header was using 47 dashes, now uses 10."
- "Both files updated."
- "Tests pass. Pushed to main."

Render examples (TLDR required):
- Explaining how something works.
- Walking through a tradeoff or a plan.
- Reporting on a multi-step change with several decisions inside it.
- Any reply that includes a heading, an A/B options block, or a fenced code block + narrative explanation.

When you do render it:

```
☻ TLDR [ds-mode]
- [bullet 1: short, plain English, no jargon]
- [bullet 2: same]
- [bullet 3: same, optional, max 3 total]

⚑ Questions for you
- [question 1: simple, with options if applicable e.g. "A) X  B) Y  C) other"]
```

Format rules:
- **Open header literal:** `☻ TLDR [ds-mode]` (dark-smiley U+263B, space, `TLDR`, space, `[ds-mode]` in lowercase brackets). **No dashes after the header. No close-rule line below the bullets.** Earlier versions added box-drawing dashes (U+2500) as visual separators; Claude's mobile renderer interprets dash runs as markdown table-divider syntax and emits literal `<tr><td>` text in the rendered output. The header chip alone is enough — bullets sit directly under it, no trailing rule.
- **Questions header literal:** `⚑ Questions for you` (black-flag U+2691). **No rule on the same line, no rule under the questions.** Same reason — dashes break.
- **Bottom only.** TLDR sits at the very bottom — never top, never middle.

Content rules (HARD CAPS — count before you send):
- **MAX 3 bullets.** Count them. If you have 4 or 5, delete bullets until exactly 3 remain. Pick the three most important.
- **MAX 12 words per bullet.** Count words in each bullet. If any bullet runs over 12 words, rewrite it shorter. If you can't fit the meaning in 12 words, the meaning is too narrow for the TLDR — generalize until it fits.
- **NO jargon.** A non-technical PM reads the TLDR. Concrete blocker list: `orchestrator`, `daemon`, `WebSocket`, `SIGINT`, `kernel`, `async`, `cron`, `regex`, `endpoint`, `stamper`, `tracker`, `hook`, `runtime`, `compiler`, `payload`, `socket`, `process`, `subprocess`, `tab`, `account` (when meaning a user account on a service), and anything else with the texture of an engineering term. If a bullet contains any of these, rewrite without it. ("WebSocket monitor spins up" → "the watcher starts up." "SIGINT" → "shut down cleanly." "orchestrator" → "the controller" or just "it.") This is the most-broken rule in practice; treat it as the bar that catches everything else.
- **No equations. No code. No file paths. No version numbers. No dates.** The TLDR paraphrases ("mass and energy are the same stuff").
- **No proper nouns unless absolutely required.** Replace with the everyday concept.
- **No semicolons. No em-dashes splicing two ideas.** One thought per bullet. Period at end.
- **ELI8, not ELI12.** A second-grader gets it. "Endpoint" → "the part of the server that answers requests". "Refactor" → "rewrite without changing what it does".
- **Brand label inside the header is always `[ds-mode]` lowercase.** Outside the header, every reference reads "DS Mode" capitalized.
- TLDR restates only what's above. No new info, no scope creep.
- **Questions block is conditional.** Include `⚑ Questions for you` ONLY when there is at least one real blocker or must-answer question. If none, OMIT the entire questions block.

### Concrete bad vs good

The screenshot regression that motivated this section:

Bad (5 bullets, jargon, too long):
- `Word-boundary check now — "One Piece" cards get the boot, "Bone Pieces" style false friends slide through clean`
- `Pokemon, MTG, YuGiOh, sports cards all still in the lineup for profit math`
- `17 test waves ridden, all pass`
- `Old orchestrator paddled out clean with SIGINT, new one already running in same tab with both accounts dialed in`
- `New WebSocket monitor spins up fresh inside orchestrator, so realtime blocklist is live too`

Good (3 bullets, plain English, ≤12 words):
- `"One Piece" cards now skipped. Other game cards still scored.`
- `All 17 tests pass.`
- `The new watcher is running. Old one shut down cleanly.`


(Skip criteria already covered at the top of this section — short status updates, fix confirmations, one-line answers, yes/no, "done" replies, pure tool-call turns. When in doubt: would a PM learn anything from a 3-bullet recap? If no, skip.)

## HTML one-pager — mode-dependent

The HTML build rule depends on the active mode.

**In `full` mode** (default), build / save / `open` an HTML one-pager when **any** of the following is true:

- Body is ≥ ~300 words or ≥ ~40 lines.
- Body has 2+ section headings (`##`, `###`, or bold-line headers).
- Body explains a multi-part concept (theories, phases, layers, components, tracks, options).
- Body contains a fenced code block + narrative explanation.
- Body presents an A/B or A/B/C decision, comparison, or tradeoff.
- User invoked `/ds-mode <prompt>` — HTML is **mandatory regardless of length**.

**Default to YES in full mode.** If you are weighing whether to build the HTML, you have already met the bar — build it. The cost is one Bash tool call. The cost of skipping is the entire reason full mode exists.

**In `lite` mode**, do **NOT** build the HTML one-pager. Skip it entirely for normal prompts even if they would have triggered HTML in full mode. The TLDR block still renders.

**Exception (both modes):** if the user invoked `/ds-mode <prompt>`, the HTML one-pager is **mandatory for this one turn regardless of mode and regardless of length**. This is the explicit "show me visually" override — lite users get a one-shot picture without leaving lite mode.

### Templates: starting points, not cages

**Prefer the stamper for the common case, but it's a starting point — not a mandate.** The four templates cover ~80% of one-pager shapes. When a reply genuinely needs a different layout, write the HTML directly or stamp + extend.

When the stamper is the right tool (the common case):

1. Pick the template kind closest to the shape you need:
   - `explainer` — how something works (hero + 1–3 captioned tiles)
   - `comparison` — A vs B (two equal columns, no hero)
   - `decision` — a choice was made (recommendation + 2–3 option tiles)
   - `status` — what changed (single hero + 1 short paragraph)
2. Build a JSON slot object with `eyebrow`, `title`, `deck`, plus the kind-specific slots (see `templates/build.mjs --help`).
3. For SVGs, reuse a stencil from `templates/stencils/` when one fits (replace the placeholder labels). When no stencil fits, draw inline.
4. Invoke the stamper via Bash using the absolute path emitted in the SessionStart header:
   ```
   node "<stamper-path>" <kind> --slots '<json>' --screenshot
   ```
   - Theme auto-resolves from `$CLAUDE_CONFIG_DIR/.ds-mode-theme`. Override with `--theme dark|light|auto` if needed.
   - `--screenshot` writes a sibling `.png` for inline embedding on Claude mobile.
5. Capture the printed HTML path; `open` it via Bash.

When to break out of the templates:

- The reply needs a layout none of the four kinds supports (e.g. a tree diagram, a timeline, a quadrant grid, a single full-bleed illustration with no tile row).
- A tile needs unusual sizing (a wider middle column, a vertical orientation).
- The hero is the entire page (no tiles, no body) and `status` doesn't quite fit.
- A template's slot count is too constraining (4 tiles, 5 options).

Two break-out paths, in order of preference:

1. **Stamp + post-edit.** Run the stamper to get the typography, palette, and footer right, then open the produced HTML and use `Edit` to adjust layout or add extra blocks. You keep the design system; you change the structure.
2. **Hand-write inline HTML.** Use the `<style>` block from `templates/_shared.css` (system tokens + `prefers-color-scheme` block + display-serif rules), an inline `<svg>` body, and the same `<footer>` shape. Follow `DESIGN.md` for the rules — banned patterns, word caps, tokens — but you own the layout. This is the right call for genuinely novel structures.

**Either path is fine.** The goal is the one-pager honoring the design system (tokens, typography, density, banned patterns), not the stamper being a hard dependency. The stamper exists to make the 80% case fast; it should not be in the way of the 20% case that needs something custom.

If you find yourself fighting a template more than three slot edits in, stop and either post-edit or hand-write. Slot-stuffing a wrong-shape template is worse than writing fresh HTML against the same tokens.

### Density caps (when filling slots)

The one-pager is visual. The picture is the answer; the words are labels.

| Element | Word cap |
|---|---|
| Title | ≤ 7 |
| Deck (one sentence) | ≤ 18 |
| Eyebrow | ≤ 4 |
| Hero caption | ≤ 10 |
| Tile label | ≤ 4 |
| Tile caption | ≤ 12 |

If the meaning won't fit, the diagram isn't doing its job. Redraw, don't lengthen the words. ELI8.

### The HTML must be VISUAL, not boxes of text

This is the rule that matters most. The whole point of the one-pager is that a PM can glance at it and grok the answer without reading prose.

- **Illustration-first.** Every major concept becomes an inline SVG illustration (~200–280px wide), with a short 1–2 sentence caption beneath it. The illustration carries the meaning; the caption is the label.
- **Hero visual at the top.** One larger inline SVG (~400×280) that captures the whole answer's gestalt — a flow with arrows, a layered stack, a journey path, before/after panels, or a metaphor (clock + light beam, bowling ball on trampoline, etc.). Title above it ≤ 6 words.
- **No bullet lists or paragraphs as the primary content.** Convert prose to captioned diagrams. Short bullet lists (≤ 3 items, ≤ 8 words each) are allowed only when a diagram genuinely can't carry the idea — but you should reach for an SVG first every time.
- **No tables.** Use side-by-side illustrated tiles instead.
- **Plain English in captions.** ELI8 still applies. "Talks to the database" not "issues SQL queries against the persistence layer." If a tech term must appear, gloss it in the same caption.
- **Restrained, classy aesthetic.** Single muted color line-art, generous whitespace, system font stack only. No gradients, no AI-slop glow, no rainbow chips, no emoji walls, no exclamation marks in headings, no all-caps shouting.
- **Dark mode is mandatory.** Drive the palette via CSS custom properties on `:root` so the page adapts to the OS preference automatically. SVG strokes/fills MUST use `currentColor` (not hardcoded hex) so the diagrams invert with the page.
  - **Light palette:** ink `#2a2a2a` on cream `#faf7f0`, muted `#6b6b66`, accent `#b85c2a` (use sparingly).
  - **Dark palette:** ink `#e8e4dc` on near-black `#1a1a1a`, muted `#8a8580`, accent `#d28258`.
  - Toggle with `@media (prefers-color-scheme: dark) { :root { --ink: ...; --bg: ...; } }`.
- **One printed page max.** Target ≤ 750px tall at 1024px wide. If content overflows, cut concepts — never shrink type below 14px, never add scroll.
- **Self-contained single file.** Inline CSS, inline SVG, no external fonts (system stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`), no JS, no CDN. Plain HTML5.

### CSS skeleton (copy-paste starting point)

```css
:root {
  --ink: #2a2a2a;
  --bg: #faf7f0;
  --muted: #6b6b66;
  --accent: #b85c2a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e8e4dc;
    --bg: #1a1a1a;
    --muted: #8a8580;
    --accent: #d28258;
  }
}
html, body { background: var(--bg); color: var(--ink); }
/* SVG inherits via currentColor: stroke="currentColor" fill="currentColor" */
.muted { color: var(--muted); }
.accent { color: var(--accent); }
```

Inside SVG elements, use `stroke="currentColor"` for line-art and `fill="currentColor"` (or `fill="none"`) — never hardcode `#2a2a2a` or any hex on stroke/fill attributes, or the diagrams break in dark mode.

### Layout pattern (use as a default scaffold)

```
┌───────────────┐
│  [Title ≤ 6 words]                              │
│                                                 │
│       [Hero SVG illustration — 400×280]         │
│       [One-line subtitle caption]               │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ [SVG 1] │  │ [SVG 2] │  │ [SVG 3] │          │
│  │ caption │  │ caption │  │ caption │          │
│  └─────────┘  └─────────┘  └─────────┘          │
└───────────────┘
```

For decision/blocker triggers, replace the bottom row with option tiles (A / B / C), each illustrated. Mark a recommendation with a small `✓ recommended` corner tag — no color flood.

### Save and open

- **Path:** `${TMPDIR:-/tmp}/dsmode-summary-YYYYMMDD-HHMMSS.html`
- **Open command (macOS):** `open ${TMPDIR:-/tmp}/dsmode-summary-YYYYMMDD-HHMMSS.html` — run via the Bash tool and verify exit code 0.
- **Mention in the reply:** one sentence above the TLDR — "Opened a one-page visual summary in your browser."

### URL formatting in the reply (mobile-safe)

When sharing any URL in the chat reply — the local `open` mention, the mobile-mode GitHub URL, anything tappable — render it as a **bare URL on its own line**, with no wrapping characters:

```
https://github.com/<user>/ds-mode-mobile/blob/main/<file>.png
```

**Never** wrap a URL in `**...**`, `_..._`, backticks, square brackets, or angle brackets. The Claude mobile app's link parser includes the wrapping characters in the link text, which breaks the tap. Markdown link syntax `[text](url)` is fine; `**url**` is not. Bare URL is safest.

## Caveman mode interaction

Caveman mode and DS Mode are **complementary**, not conflicting.
- Response body: caveman style — drop articles, fragments OK, terse synonyms.
- TLDR bullets: caveman style is fine *inside* the bullets, as long as each bullet still reads as plain English a non-technical PM understands in one pass. ELI8 spirit still holds.
- HTML one-pager: rendered in full English (not caveman). It's a deliverable for a PM, not a terminal-friendly compression.

The TLDR block ALWAYS renders. Caveman never skips it.

## Explanatory mode interaction

If `★ Insight ─────` blocks are also requested, keep them inline mid-response where the teaching moment fits. TLDR still goes at the very bottom, separate from any Insight block.

## Self-check before sending every response

You may not send the reply until you have answered each of these. If any HTML answer is "no" when triggers fire, STOP, build the HTML, then send.

1. **HTML — did I build it?** Mode-dependent: in **full** mode, if body is non-trivial AND any HTML trigger fires (length / density / multi-part concept / code + narrative / decision) I have built and `open`ed the HTML. In **lite** mode, I skipped the HTML build entirely UNLESS the user invoked `/ds-mode <prompt>` for this turn — in which case I built it regardless.
2. **HTML — visual, not text-blocks?** Hero SVG at top + illustrated tiles for each concept. No bullet lists or paragraphs as primary content. No tables. Captions are short and plain English.
3. **HTML — did I `open` it?** Ran `open ${TMPDIR:-/tmp}/dsmode-summary-YYYYMMDD-HHMMSS.html` via the Bash tool, exit code 0.
4. **HTML — mentioned in reply?** Exactly one sentence above the TLDR: "Opened a one-page visual summary in your browser."
5. **TLDR present?** Response > 3 sentences or technical → TLDR block at bottom with the literal header `☻ TLDR [ds-mode]`. No dashes after the header. No close-rule line under the bullets.
6. **TLDR shape — count out loud:**
   a. Count bullets. Is the number exactly ≤ 3? If 4 or 5, delete bullets until 3.
   b. Count words in each bullet. Is each one ≤ 12 words? If any bullet is over, rewrite it shorter — do not let a long bullet ship.
   c. Read each bullet aloud. Does it use any term from the jargon blocklist (orchestrator, daemon, WebSocket, SIGINT, kernel, async, cron, regex, endpoint, stamper, tracker, hook, runtime, compiler, payload, socket, process, subprocess, tab, account-on-a-service)? If yes, rewrite plain.
   d. Is each bullet ELI8? A second-grader gets it? If a bullet still reads "engineering," rewrite it for a PM.
7. **Questions section:** include only if real blockers exist. Otherwise omit entirely — no "- none" placeholder. No close-rule dashes.
8. **Brand label:** every reference outside the header reads "DS Mode".

The HTML failing to fire — or firing as a wall of text — is the #1 way this mode breaks. The TLDR running long with jargon is #2. Treat 1–4 and 6 as the most important checks in the file. Items 6a–6c are LITERAL counting/checking steps; do them on every TLDR you draft.
