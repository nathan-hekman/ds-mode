# DS Mode for Cursor

Adds a plain-English TL;DR to the bottom of every Cursor reply, plus an
auto-generated one-page HTML visual when the answer runs long.

## Install

### Per-project (recommended)

Drop `.cursorrules` into the root of any project you want DS Mode to apply to:

```sh
curl -o .cursorrules \
  https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/cursor/.cursorrules
```

Cursor reads `.cursorrules` automatically on every chat in that project. No
restart required.

### User-level (every project)

Cursor's newer `.cursor/rules/*.mdc` system supports global user rules.
To make DS Mode the default for all your projects:

1. Open Cursor → Settings → Rules
2. Paste the contents of [`.cursorrules`](./.cursorrules) into "User Rules".
3. Save.

## Use

Just chat in Cursor. Every non-trivial reply gets the TL;DR. Long or dense
replies also pop open a one-page HTML in your browser.

## Compatibility caveats

- **Auto-HTML works** because Cursor's agent has terminal access and can run
  `open` / `xdg-open` / `start`.
- **Quiz cards (A/B/C blocker tiles)** render in the HTML pop-up, not in the
  chat itself.
- **Multiple rules files**: if your project already has a `.cursorrules`,
  append the DS Mode rules to it instead of overwriting.

## Uninstall

```sh
rm .cursorrules
```

Or delete just the DS Mode portion if you appended to an existing file.

## Customize

Open `.cursorrules` and edit. Common knobs:

- **Bullet caps** — default is 3 bullets × 12 words.
- **Visual triggers** — adjust the word/heading thresholds.
- **Header text** — the literal `-----------TLDR [DS Mode]------------` is
  one string. Swap it.
