---
name: ds-mode-help
description: Quick-reference card for DS Mode — modes, commands, where files go. One-shot display, not a persistent mode. Trigger when user asks "/ds-mode-help", "what does ds-mode do", "how do I use ds mode", or "ds mode help".
---

# DS Mode Help

Display this reference card when invoked. One-shot — do NOT change any state, write flag files, or persist anything. Output in plain prose (no caveman compression) so the card is readable as a reference.

## What DS Mode does

A Claude Code plugin that adds two things to non-trivial replies:

1. A plain-English **TLDR block** at the bottom of the message — 3 bullets max, 12 words each, ELI8.
2. A **visual HTML one-pager** opened in your browser when the reply is a decent length. Illustration-first — hero SVG + captioned tiles, not boxes of text.

DS Mode is **active by default** once installed (mode = `full`).

### What the TLDR block looks like

```
☻ TLDR [ds-mode] ──────────
- short plain-English point
- another point
- one more, max three
───────────────

⚑ Questions for you
- A) option one  B) option two  C) defer
───────────────
```

The `⚑ Questions for you` block only appears when there's a real blocker.

## Modes

| Mode | Behavior |
|------|----------|
| **lite** | TLDR only. No HTML one-pager unless you explicitly invoke `/ds-mode <prompt>`. Best for terminal-heavy workflows. |
| **full** | TLDR + auto HTML one-pager when the reply is a decent length (≥ ~300 words, multi-part concept, 2+ headings, code + narrative, A/B decision). **Default.** |
| **off** | Disabled this session. Hooks emit nothing. |

The active mode is set per-session via `/ds-mode lite|full` and persists in `$CLAUDE_CONFIG_DIR/.ds-mode-active`.

## Commands

| Command | What it does |
|---------|-------------|
| `/ds-mode` | Confirm DS Mode is active at the default mode. |
| `/ds-mode lite` | Switch to lite mode (TLDR only). |
| `/ds-mode full` | Switch to full mode (TLDR + auto HTML). |
| `/ds-mode on` | Re-enable at default mode. |
| `/ds-mode off` | Disable for this session. |
| `/ds-mode <your question>` | Answer the question AND force the visual HTML one-pager for this turn — works in both lite and full mode. |
| `/ds-mode-help` | This card. |

## Natural-language triggers

- "stop ds mode" / "ds mode off" / "disable ds mode" — disable for the session
- "ds mode on" / "activate ds mode" / "turn on ds mode" — re-enable at default

## Configure default

DS Mode starts in `full` mode by default. To change the default for new sessions, set an env var:

```bash
export DS_MODE_DEFAULT=lite     # start in lite mode
export DS_MODE_DEFAULT=off      # start disabled
```

Add to your shell's rc file (`~/.zshrc`, `~/.bashrc`, etc.) to make it stick. The installer can write this for you with `./install.sh --default-mode lite` or `./install.sh --default-off`.

## Where files go

| Path | Purpose |
|------|---------|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | Flag file — contains active mode (`lite` or `full`). |
| `$CLAUDE_CONFIG_DIR/.ds-mode-installed` | Sentinel — written on first run so a user-chosen disable state survives sessions. |
| `$TMPDIR/dsmode-summary-<timestamp>.html` | Auto-generated one-pagers (ephemeral). |

DS Mode never writes into your project tree.

## Uninstall

```bash
claude plugin uninstall ds-mode@ds-mode
claude plugin marketplace remove ds-mode
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" "$CLAUDE_CONFIG_DIR/.ds-mode-installed"
# Remove the DS_MODE_DEFAULT export from your shell rc if you don't want it.
```

## More

- Repository: https://github.com/nathan-hekman/ds-mode
- Install reference: https://github.com/nathan-hekman/ds-mode/blob/main/INSTALL.md
