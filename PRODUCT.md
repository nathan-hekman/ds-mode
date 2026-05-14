# DS Mode — PRODUCT.md

## Register
brand

The HTML one-pager IS the product. Each generated page is a deliverable a PM
or founder reads in one glance and walks away from. Design isn't decoration —
it's the answer.

## Audience

- **Primary:** Nathan (solo indie iOS dev, PM background) using Claude Code on
  macOS. Reads the one-pagers in Safari and the Claude mobile app.
- **Secondary:** PMs, founders, non-technical leads receiving these as
  artifacts shared in design reviews, Slack threads, or one-on-one screen shares.
- **Tertiary:** developers who installed DS Mode for code-explanation tasks
  and want their own answers translated back to plain English.

## Product purpose

DS Mode is a Claude Code plugin that adds two things to non-trivial replies:

1. A plain-English TL;DR block at the very bottom — three bullets, ELI8, no jargon.
2. A visual HTML one-pager opened in the browser when the reply is a decent
   length. Illustration-first.

The one-pager carries the entire idea. Captions are tiny labels, not paragraphs.

## Voice

- Plain English. ELI8. "Talks to the database," not "issues SQL queries
  against the persistence layer."
- Calm, restrained, editorial. The New Yorker over LinkedIn.
- One thing per page. The visual is the answer; captions are labels.
- Never AI-slop: no exclamation marks in headings, no rainbow chips, no emoji
  walls, no gradient text, no glow.

## Anti-references

- SaaS dashboard "hero-metric" template (big colored number + small label,
  repeated three times across).
- Notion / Linear duplicated card grids of identical icon + heading + body.
- AI-tool default aesthetics (gradient backgrounds, glassmorphism, neon).
- Crypto and fintech navy-and-gold defaults.
- Generic "magazine editorial" template that's just italic serif + photo grid.
  Editorial is a typographic discipline, not a style.

## Strategic principles

- The visual is the answer. Prose is supporting cast.
- Cream-and-ink, dark-and-cream. Editorial color, not brand color. One
  accent (warm terracotta) used under 5% of the surface.
- Self-contained single file. Inline CSS, inline SVG. No CDN, no JS, no
  external fonts. Apple-native serif (New York) for display.
- Dark mode is mandatory via `prefers-color-scheme`. Both palettes are
  equally restrained — dark isn't a "feature," it's the same design at
  a different temperature.
- One concept per page. Two concepts mean two pages.
