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

The canonical path is `scripts/ship.sh`, which gates every release behind
a test suite + an interactive confirmation prompt. Claude never auto-pushes.

```bash
scripts/ship.sh patch     # 1.6.0 -> 1.6.1
scripts/ship.sh minor     # 1.6.0 -> 1.7.0
scripts/ship.sh major     # 1.6.0 -> 2.0.0
scripts/ship.sh --dry-run patch    # rehearse without touching git
```

The script:

1. Runs `tests/run.sh` (static + dynamic). Refuses to proceed on failure.
2. Bumps `plugin.json` + `marketplace.json` in lockstep.
3. Re-validates the plugin manifest.
4. Shows a diff summary and the version that's about to ship.
5. **Stops and waits for you to type `ship`.** Anything else aborts.
6. On approval: commits the bump, pushes `main`, creates the
   `ds-mode--vX.Y.Z` tag via `claude plugin tag`, pushes the tag, and
   creates a GitHub Release with placeholder notes.
7. After it exits: edit the release notes on the web (or via
   `gh release edit`), stamp a hero PNG, and upload it as a release asset:
   ```bash
   node templates/build.mjs status --slots "$(cat slots.json)" --screenshot
   gh release upload ds-mode--vX.Y.Z /tmp/v<X.Y.Z>.png --clobber
   ```

## Tests — what they check

`tests/run.sh` runs two suites:

- **`tests/static.sh`** — manifest validation, version-match between
  plugin.json and marketplace.json, syntax of every hook script and the
  stamper, no pictographic-emoji leak, no standalone-dash lines (the
  Claude-mobile table-bait regression), TLDR sample-header shape in both
  rules and help docs, command argument-hint hygiene, all four templates
  present, README mentions every documented subcommand.
- **`tests/dynamic.sh`** — runs the activate and tracker hooks against a
  throwaway `CLAUDE_CONFIG_DIR`, dispatches every command (lite, full,
  off, dark, theme writes, mobile status, /ds-mode <prompt>), verifies
  reminder shape, stamps each of the four templates and asserts valid
  HTML, optionally screenshots via headless Chrome, checks statusline
  chip with and without the update flag.

GitHub Actions runs both suites on every push to `main` and every PR via
`.github/workflows/ci.yml`. Add the green badge to README once a workflow
run succeeds.

## When to bump major / minor / patch

- **major** — breaking change to a documented command, the TLDR shape, or
  any file the user might reasonably depend on. Rare. Last (and only) was
  v1.0.0.
- **minor** — new feature or removed feature without breaking existing
  flags. Theme toggle (v1.1.0), update detection (v1.2.0), mobile mode
  (v1.3.0), docs sweep (v1.4.0), surfer-egg removal (v1.5.0), tests +
  ship gate (v1.6.0).
- **patch** — bug fix, visual polish, doc tweak. No new behavior.

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
