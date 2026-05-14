---
name: ds-mode-help
description: Quick-reference card for DS Mode — what it does, how to toggle it, where files go. One-shot display, not a persistent mode. Trigger when user asks "/ds-mode-help", "what does ds-mode do", "how do I use ds mode", or "ds mode help".
---

# DS Mode Help

Display this reference card when invoked. One-shot — do NOT change any state, write flag files, or persist anything. Output in plain prose (no caveman compression) so the card is readable as a reference.

## What DS Mode does

A Claude Code plugin that adds two things to non-trivial replies, automatically:

1. A plain-English **TLDR block** at the bottom of the message — 3 bullets max, 12 words each, ELI8.
2. A **visual HTML one-pager** opened in your browser whenever the reply is a decent length (≥ ~300 words, multi-part concept, 2+ headings, code + narrative, or A/B decision). The HTML is illustration-first — hero SVG + captioned tiles, not boxes of text.

DS Mode is **active by default** once installed. No tiers, no flags to memorize.

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

The `⚑ Questions for you` block only appears when there's a real blocker. The TLDR block always appears on non-trivial replies.

## Commands

| Command | What it does |
|---------|-------------|
| `/ds-mode` | Confirm DS Mode is active (or re-enable if previously disabled). |
| `/ds-mode on` | Re-enable for this session. |
| `/ds-mode off` | Disable for this session. |
| `/ds-mode <your question>` | Answer the question under DS Mode rules AND force the visual HTML one-pager for this turn, regardless of length. |
| `/ds-mode-help` | This card. |

## Natural-language triggers

- "stop ds mode" / "ds mode off" / "disable ds mode" — disable for the session
- "ds mode on" / "activate ds mode" / "turn on ds mode" — re-enable

## Configure default

DS Mode starts active by default. To start sessions disabled:

```bash
export DS_MODE_DEFAULT=off
```

Apply by adding the export to your shell's rc file (`~/.zshrc`, `~/.bashrc`, etc.).

## Where files go

| Path | Purpose |
|------|---------|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | Flag file — exists when DS Mode is active. |
| `$CLAUDE_CONFIG_DIR/.ds-mode-installed` | Sentinel — written on first run so disable state survives sessions. |
| `$TMPDIR/dsmode-summary-<timestamp>.html` | Auto-generated one-pagers (ephemeral). |

DS Mode never writes into your project tree.

## Uninstall

```bash
rm -rf "$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode"
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" "$CLAUDE_CONFIG_DIR/.ds-mode-installed"
```

## More

- Repository: https://github.com/nathan-hekman/ds-mode
- Install reference: https://github.com/nathan-hekman/ds-mode/blob/main/INSTALL.md
