<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/ds-mode-logo-dark.png">
    <img src="docs/assets/ds-mode-logo.png" alt="DS Mode" width="360">
  </picture>
</p>

<h2 align="center">Answers in plain English. With pretty pictures.</h2>

<p align="center">
  <strong>DS Mode</strong> <code>/dɛs məʊd/</code> <em>n.</em> &nbsp;from German <em>Dumm Sprecht</em>: to speak simply.
</p>

<p align="center">
  Big-brain reply on top. Plain-English nudge at the bottom.<br>
  Pictures when things get long.
</p>

<p align="center">
  For
  <img src="docs/assets/icon-claude.png" width="14" valign="middle"> Claude Code ·
  <img src="docs/assets/icon-cursor.png" width="14" valign="middle"> Cursor ·
  <img src="docs/assets/icon-codex.svg" width="14" valign="middle"> Codex ·
  <img src="docs/assets/icon-copilot.svg" width="14" valign="middle"> Copilot
</p>

<p align="center">
  <a href="https://nathan-hekman.github.io/ds-mode/"><strong>Landing page →</strong></a> ·
  <a href="#install-everything-one-liner">Install</a> ·
  <a href="#supported-tools">Supported tools</a>
</p>

<p align="center">
  <img src="docs/assets/ds-mode-example.png" alt="DS Mode in action — the yellow block at the bottom is what DS Mode adds" width="720">
</p>

<p align="center"><em>The top is the normal AI answer. The yellow block at the bottom is what DS Mode adds.</em></p>

---

DS Mode is a system-prompt overlay for AI coding agents. It does two things:

1. **Adds a plain-English TL;DR to the bottom** of every long or technical reply.
   Three bullets, twelve words each, no jargon.
2. **Auto-generates a one-page HTML visual** in your browser when the answer
   runs long or covers many parts.

Built for product managers, founders, and **anyone who'd rather skim a TL;DR
than parse a wall of jargon**.

> *For people who skim. Built by one of them.*

## What it does

| | |
|---|---|
| **TL;DR block** | Every long or technical reply ends with a 2-3 bullet recap. Hard cap: 12 words per bullet. Plain English. No jargon. |
| **One-page visual** | When the answer is long, dense, decision-time, or has 2+ blockers, an HTML summary opens in your browser. |
| **Asks only what it needs** | When the AI needs your input to keep going, it asks as scannable A/B/C tiles. When it doesn't, it stays quiet. |

<a id="install"></a>

## Install everything (one-liner)

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-all.sh)
```

Detects which AI tools you have and installs DS Mode user-globally where it
can (Claude Code, Codex CLI). For per-repo tools (Cursor, Copilot), it prints
the one-liner you run from the repo root.

## Install for one tool

Pick your tool:

### <img src="docs/assets/icon-claude.png" width="20" valign="middle"> Claude Code

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

Copies the rules into `~/.claude/` and sets `"outputStyle": "DS Mode"`
in `~/.claude/settings.json` so DS Mode loads on every session.

Per-session toggle: `/dsm` (or `/ds-mode`).
Off: remove the `"outputStyle"` line from `~/.claude/settings.json`.

### <img src="docs/assets/icon-cursor.png" width="20" valign="middle"> Cursor (per-project)

```sh
curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/cursor/.cursorrules -o .cursorrules
```

Run from your project root. Or paste the file contents into Cursor → Settings → Rules → User Rules for global.

Full docs: [adapters/cursor/README.md](./adapters/cursor/README.md)

### <img src="docs/assets/icon-codex.svg" width="20" valign="middle"> OpenAI Codex CLI (user-global)

```sh
mkdir -p ~/.codex && curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/codex/AGENTS.md -o ~/.codex/AGENTS.md
```

Or drop `AGENTS.md` in any project root for per-project.

Full docs: [adapters/codex/README.md](./adapters/codex/README.md)

### <img src="docs/assets/icon-copilot.svg" width="20" valign="middle"> GitHub Copilot Chat (per-repo)

```sh
mkdir -p .github && curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/copilot/copilot-instructions.md -o .github/copilot-instructions.md
```

Commit + push. Copilot picks it up on the next chat in that repo.

Caveat: standard Copilot Chat can't run shell commands, so the auto-HTML pop-up doesn't fire — DS Mode falls back to a markdown summary block. Copilot Workspace's agent mode does support the full HTML feature.

Full docs: [adapters/copilot/README.md](./adapters/copilot/README.md)

<a id="supported-tools"></a>

## Supported tools

| Tool | TL;DR | Auto-HTML | Quiz cards | Install path |
|---|:---:|:---:|:---:|---|
| <img src="docs/assets/icon-claude.png" width="18" valign="middle"> **Claude Code** | ✓ | ✓ | ✓ | `./install.sh --permanent` |
| <img src="docs/assets/icon-cursor.png" width="18" valign="middle"> **Cursor** | ✓ | ✓ | ✓ | `.cursorrules` |
| <img src="docs/assets/icon-codex.svg" width="18" valign="middle"> **OpenAI Codex CLI** | ✓ | ✓ | ✓ | `~/.codex/AGENTS.md` |
| <img src="docs/assets/icon-copilot.svg" width="18" valign="middle"> **GitHub Copilot Chat** | ✓ | markdown fallback | markdown fallback | `.github/copilot-instructions.md` |
| <img src="docs/assets/icon-copilot.svg" width="18" valign="middle"> **Copilot Workspace agent** | ✓ | ✓ | ✓ | same as Copilot |
| **Continue / aider / others** | — | — | — | PRs welcome |

The auto-HTML feature requires the agent to run a shell command mid-response
(`open` / `xdg-open` / `start`). Tools without shell access fall back to a
markdown summary block.

## When the visual fires

Four triggers — any one of them opens the one-page summary (or, on Copilot,
renders the markdown fallback):

| Trigger | When |
|---|---|
| **Long** | Body has ~400+ words, ~50+ lines, or 2+ code blocks |
| **Dense** | Body has 2+ headings, an equation, or a multi-part concept |
| **Decision** | You just landed a brainstorm or plan ("ok, let's do it") |
| **Needs your call** | The AI has 2+ real questions for you to answer |

HTML files are saved to `/tmp/dsmode-summary-YYYYMMDD-HHMMSS.html` and opened
with the OS default-browser handler.

## Customize

The rules live in a single text file per platform:

- Claude Code: `~/.claude/output-styles/ds-mode.md`
- Cursor: `.cursorrules` (project) or User Rules (Cursor settings)
- Codex: `~/.codex/AGENTS.md` or `AGENTS.md` (project)
- Copilot: `.github/copilot-instructions.md`

Edit the file, restart your session if needed, the new behavior takes effect
on the next response.

Common knobs:

- **Bullet caps** — default is 3 bullets × 12 words. Loosen for richer recaps.
- **Visual triggers** — raise or lower the word/heading thresholds.
- **Header text** — the literal `-----------TLDR [DS Mode]------------` is one
  string. Swap it.

## Why DS Mode

Default AI coding-agent responses are great for engineers. They're rough on
everyone else. Dense walls of jargon. Equations mid-sentence. Ten-bullet recaps
that are themselves a wall.

DS Mode keeps the depth where it belongs (top of the answer) and adds a short,
plain-English recap at the bottom — plus a one-page visual when the answer earns
one. You can read the technical version, the recap, the picture, or all three.

## License

MIT — see [LICENSE](./LICENSE).

Source: [github.com/nathan-hekman/ds-mode](https://github.com/nathan-hekman/ds-mode)

## Contributing

PRs welcome. Especially:

- Adapters for other tools (Continue, aider, JetBrains AI Assistant, etc.)
- Better cartoon SVGs for the visual one-pager
- Translations of the plain-English style for other languages
- Cross-platform fixes for the `open` behavior (Linux, Windows)

Open an issue at [nathan-hekman/ds-mode/issues](https://github.com/nathan-hekman/ds-mode/issues)
to request a port or report a bug.
