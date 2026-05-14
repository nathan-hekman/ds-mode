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
  A visual one-pager when things get long.
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
  <a href="#install">Install</a> ·
  <a href="#what-you-get">What You Get</a>
</p>

<p align="center">
  <img src="docs/assets/ds-mode-example.png" alt="DS Mode in action — the yellow block at the bottom is what DS Mode adds" width="720">
</p>

<p align="center"><em>The top is the normal AI answer. The yellow block at the bottom is what DS Mode adds.</em></p>

---

DS Mode is a system-prompt overlay for AI coding agents. Install it and it just works — no modes to memorize, no flags to fiddle with. It does two things:

1. **Adds a plain-English TL;DR to the bottom** of every long or technical reply. Three bullets, twelve words each, no jargon.
2. **Auto-generates a one-page visual HTML** in your browser when the answer is a decent length. Illustration-first — hero diagram + captioned tiles, not boxes of text.

Built for product managers, founders, and **anyone who'd rather skim a picture than parse a wall of jargon**.

> *For people who skim. Built by one of them.*

## Install

**Pure Claude Code commands (recommended):**

```bash
claude plugin marketplace add nathan-hekman/ds-mode
claude plugin install ds-mode@ds-mode
```

DS Mode now appears in `claude plugin list` and in Claude Code's desktop plugin UI. Restart Claude Code to activate.

**One-line install with extras** (sets `DS_MODE_DEFAULT=on` in your shell rc, strips the legacy `outputStyle` setting):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

DS Mode is on by default in every new session. Toggle per-session with `/ds-mode off` and `/ds-mode on`.

See [INSTALL.md](./INSTALL.md) for advanced flags, local-clone install, and uninstall.

## What You Get

| Feature | Claude Code | Cursor / Windsurf | Copilot | Codex |
|---|:-:|:-:|:-:|:-:|
| Plain-English TLDR at bottom of replies | Y | Y* | Y* | Y* |
| Visual HTML one-pager when reply is decent length | Y | Y* | markdown fallback | Y* |
| `/ds-mode <your question>` — forced visual one-pager | Y | — | — | — |
| `/ds-mode off` / `/ds-mode on` toggle | Y | — | — | — |
| Statusline `DS` chip when active | Y | — | — | — |
| `/ds-mode-help` (quick-reference card) | Y | — | — | — |

\* Cursor/Codex get the full ruleset via the adapter files in `adapters/` and can run the HTML build themselves (they have shell access). Copilot Chat in standard mode renders a markdown summary instead; in Copilot Workspace agent mode it can build real HTML.

## Usage

Once installed, DS Mode is automatic on every session. You don't need to do anything — long, technical replies get a plain-English TLDR at the bottom and a visual HTML one-pager pops open in your browser when the answer is long enough.

When you want explicit control:

- `/ds-mode off` — disable for this session (TLDR + HTML pause).
- `/ds-mode on` — re-enable for this session.
- `/ds-mode Explain how the architecture works` — answer this question under DS Mode rules **and force the visual HTML one-pager**, even if the answer is short. This is the "show me visually" lever.
- `/ds-mode-help` — show the quick-reference card.

You can also use natural language: "stop ds mode", "ds mode on", etc.

## How It Works

DS Mode is a Claude Code plugin (`.claude-plugin/plugin.json`). It registers two hooks:

1. **SessionStart** (`hooks/ds-mode-activate.js`) — activates DS Mode by default and injects `rules/ds-mode.md` as session context. (The ruleset lives in `rules/` instead of `skills/` on purpose so Claude Code doesn't register it as a user-invocable skill — that would clash with the `/ds-mode` command.)
2. **UserPromptSubmit** (`hooks/ds-mode-tracker.js`) — parses `/ds-mode` commands, handles on/off toggling, and re-anchors a short reminder every turn so the rules survive context compression. When you invoke `/ds-mode <prompt>`, this hook flags the turn as HTML-mandatory.

State is a single flag file at `$CLAUDE_CONFIG_DIR/.ds-mode-active` — present = active, absent = off. HTML outputs are ephemeral in `$TMPDIR`.

## Other Tools

The `adapters/` directory holds rule-file generators for Cursor, Copilot, and Codex. Cursor and Codex get the full experience including HTML one-pagers (they have shell access). Copilot Chat in standard mode falls back to a markdown summary block. See `adapters/<tool>/README.md`.

## Why DS Mode

Default AI coding-agent responses are great for engineers. They're rough on everyone else. Dense walls of jargon. Equations mid-sentence. Ten-bullet recaps that are themselves a wall.

DS Mode keeps the depth where it belongs (top of the answer) and adds a short, plain-English recap at the bottom — plus a one-page visual when the answer earns one. You can read the technical version, the recap, the picture, or all three.

## License

MIT — see [LICENSE](./LICENSE).

Source: [github.com/nathan-hekman/ds-mode](https://github.com/nathan-hekman/ds-mode)

## Contributing

PRs welcome. Especially:

- Adapters for other tools (Continue, aider, JetBrains AI Assistant, etc.)
- Better cartoon SVGs for the visual one-pager
- Translations of the plain-English style for other languages
- Cross-platform fixes for the `open` behavior (Linux, Windows)

Open an issue at [nathan-hekman/ds-mode/issues](https://github.com/nathan-hekman/ds-mode/issues) to request a port or report a bug.
