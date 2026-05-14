# Releasing DS Mode

The release process and the format every GitHub Release notes page follows.

## Release notes — format

Same shape every time, top to bottom:

1. **Hero image at the very top.** A stamped DS Mode one-pager rendered
   as PNG, **attached as a release asset** (NOT committed to the repo),
   embedded via the release-download URL.
2. **TLDR block** — three short, plain-English, ELI8 bullets. Twelve
   words max each. No jargon.
3. **What's new** — three to five short bullets, plain English, "you can
   now…" voice. Upbeat.
4. **How to update** — one shell snippet.
5. **Compare link** at the very bottom, single line.

The hero PNG carries the explanation; the bullets confirm. A release
notes page that needs scrolling is too long.

## Asset hosting — release assets, NOT the repo

**Never commit hero PNGs to `main`.** Binaries in git history bloat
clones forever, slow plugin installs, and punish every fork. Instead,
attach them as **release assets** on the GitHub Release that owns them.
Assets live alongside the tag, served from GitHub's CDN, free.

Asset URL pattern:

```
https://github.com/nathan-hekman/ds-mode/releases/download/ds-mode--v<X.Y.Z>/v<X.Y.Z>.png
```

Why this scales:

| Approach | Repo bloat | Mobile-friendly | Free | Maintenance |
|---|---|---|---|---|
| In `main` under `docs/assets/` | Grows forever | Yes | Yes | None, but grows |
| **Release assets** | **Zero** | **Yes** | **Yes** | **None** |
| External CDN (S3, R2, imgur) | Zero | Yes | Maybe | One more vendor |

Release assets win on every axis that matters.

## Voice

- Upbeat but calm. "Yeah, this one's nice." Not the rocket-and-confetti SaaS holler.
- ELI8. A twelve-year-old should grok the bullets.
- No exclamation marks anywhere.
- No emoji except the TLDR header glyph or the surfer-tone easter egg.
- One sentence per bullet. One idea per sentence.

## Release flow

1. Update `plugin.json` and `marketplace.json` `version` fields. Match.
2. Stamp a hero PNG locally:
   ```bash
   node templates/build.mjs <kind> --slots "$(cat slots.json)" --screenshot
   ```
   Pick `status` for patch releases (hero + 1 paragraph), `explainer`
   for feature releases (hero + 2–3 tiles).
3. Commit + push the code changes to `main`. **Do NOT commit the PNG.**
4. `claude plugin tag .` → creates `ds-mode--vX.Y.Z` git tag.
5. `git push origin refs/tags/ds-mode--vX.Y.Z`.
6. Create the GitHub Release:
   ```bash
   gh release create ds-mode--vX.Y.Z \
     --title "DS Mode vX.Y.Z — <short tagline>" \
     --notes "$(cat release-notes.md)"
   ```
7. Upload the hero PNG as a release asset:
   ```bash
   gh release upload ds-mode--vX.Y.Z /tmp/v<X.Y.Z>.png --clobber
   ```
   Rename the file `v<X.Y.Z>.png` first so the asset URL is predictable.
8. Verify the hero image renders on the release page. Refresh once;
   GitHub caches eagerly.

## Release notes template

```markdown
![vX.Y.Z hero](https://github.com/nathan-hekman/ds-mode/releases/download/ds-mode--vX.Y.Z/vX.Y.Z.png)

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

\`\`\`bash
claude plugin update ds-mode@ds-mode
\`\`\`

[Full diff](https://github.com/nathan-hekman/ds-mode/compare/ds-mode--v<PREV>...ds-mode--v<THIS>)
```

## In-chat one-pagers (not release artifacts)

For one-pagers generated inside a Claude chat that are *not* tied to a
release:

- Stamp to `$TMPDIR/dsmode-summary-<timestamp>.html` and `open` it.
- The browser pop-up on the user's Mac is the deliverable.
- **Do not commit these PNGs to the repo.** They're ephemeral.
- The PNG sidecar (`--screenshot`) is for inline embedding via Claude's
  Read tool. That renders on Claude desktop but not all mobile clients
  — call it out plainly when relevant. If the user needs to view on
  mobile, they can open the HTML on their Mac and AirDrop / iMessage
  the screenshot themselves, or run on a Mac at all.

## Cleaning up the bootstrap commit

The first three releases (v1.0.0, v1.0.1, v1.1.0) had their hero PNGs
briefly committed under `docs/assets/releases/` before the asset-workflow
was adopted. Those PNGs have been removed from `main`. They remain in
git history (~150KB total) — not worth rewriting history for. Future
releases follow the asset workflow above.
