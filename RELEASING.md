# Releasing DS Mode

The release process and the format that every GitHub Release notes page follows.

## Release notes — format

Every release notes page has the same shape, in this order from top to bottom:

1. **Hero image at the very top.** A stamped DS Mode one-pager rendered as PNG, hosted in this repo at `docs/assets/releases/<version>.png`, embedded via `raw.githubusercontent.com` so it renders on github.com, mobile clients, and link previews. The hero is the headline.
2. **TLDR block** — three short, plain-English, ELI8 bullets. Twelve words max each. No jargon. Same content rules as the runtime TLDR block. Open + close rules are markdown-friendly because GitHub's renderer strips zero-width unicode unpredictably; use a simple horizontal `---` instead.
3. **What's new** — three to five short bullets, plain English, "you can now…" voice. Upbeat. No paragraphs.
4. **How to update** — one shell snippet.
5. **Compare link** at the very bottom, single line.

Keep it short. A release notes page that needs scrolling is too long. The hero PNG carries the explanation; the bullets confirm.

## Voice

- Upbeat but calm. "Yeah, this one's nice." Not "🚀 SHIPPED."
- ELI8. A twelve-year-old should grok the bullets.
- No exclamation marks anywhere.
- No emoji except in the TLDR header glyph or the surfer-tone easter egg.
- One sentence per bullet. One idea per sentence.

## Template

```markdown
![v1.X.Y hero](https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/docs/assets/releases/v1.X.Y.png)

---

**☻ TLDR**

- short plain bullet
- another short plain bullet
- one more (optional, max three)

---

**What's new**

- you can now …
- the picture is …
- and one bonus …

**How to update**

```bash
claude plugin update ds-mode@ds-mode
```

[Full diff](https://github.com/nathan-hekman/ds-mode/compare/ds-mode--v{PREV}...ds-mode--v{THIS})
```

## Release flow

1. Update `plugin.json` and `marketplace.json` version field. Match exactly.
2. Stamp a hero PNG. Use the `status` template for patch releases (single
   visual + short body) or the `explainer` template for feature releases
   (hero + 2-3 tiles). Save the PNG at `docs/assets/releases/v<X.Y.Z>.png`.
3. Commit + push to `main` first. Include the hero PNG in the same commit.
4. Run `claude plugin tag .` to create the `ds-mode--vX.Y.Z` git tag.
5. `git push origin refs/tags/ds-mode--vX.Y.Z`.
6. Run `gh release create ds-mode--vX.Y.Z --title "DS Mode vX.Y.Z — short tagline" --notes "..."` with the body following the template above.
7. Verify the hero image actually renders on the release page (refresh once; raw.githubusercontent caches eagerly).

## Why this shape

- The visual is the answer. A wall of markdown bullets buries it.
- DS Mode's product principle is "plain English at the bottom, picture
  when the answer earns it." Release notes are the answer for a release;
  they earn the picture.
- Hosted PNGs work everywhere — desktop browsers, mobile Safari, the
  Claude mobile app, Slack link previews, Twitter cards. Inline base64
  doesn't survive all renderers; local `/var/folders/...` paths render
  only on the dev's machine.
