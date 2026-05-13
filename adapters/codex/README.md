# DS Mode for OpenAI Codex CLI

Adds a plain-English TL;DR to the bottom of every Codex CLI reply, plus an
auto-generated one-page HTML visual when the answer runs long.

## Install

### Per-user (every Codex session)

Codex CLI reads `AGENTS.md` files from your home directory and the working
directory, in that order. To make DS Mode the default for all your Codex
sessions:

```sh
mkdir -p ~/.codex
curl -o ~/.codex/AGENTS.md \
  https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/codex/AGENTS.md
```

If you already have a `~/.codex/AGENTS.md`, append the DS Mode contents
to the bottom instead of overwriting:

```sh
curl -s https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/codex/AGENTS.md \
  >> ~/.codex/AGENTS.md
```

### Per-project

Drop `AGENTS.md` at the root of any project:

```sh
curl -o AGENTS.md \
  https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/codex/AGENTS.md
```

Codex picks it up automatically when you run `codex` from that directory.

## Use

Just run `codex` and chat. Every non-trivial reply gets the TL;DR. Long
or dense replies also pop open a one-page HTML in your browser.

## Compatibility caveats

- **Auto-HTML works** because Codex CLI runs in a terminal with shell
  access — `open` / `xdg-open` / `start` all work depending on OS.
- **Quiz cards (A/B/C blocker tiles)** render in the HTML pop-up.
- **Codex web/cloud** environments without local browser access will save
  the HTML to `/tmp/` but not open it; the user can fetch it manually.

## Uninstall

```sh
rm ~/.codex/AGENTS.md       # if you installed user-wide
rm AGENTS.md                # if you installed per-project
```

Or just remove the DS Mode portion if you appended to an existing file.

## Customize

Open `AGENTS.md` and edit. Common knobs:

- **Bullet caps** — default is 3 bullets × 12 words.
- **Visual triggers** — adjust the word/heading thresholds.
- **Header text** — the literal `-----------TLDR [DS Mode]------------` is
  one string. Swap it.
