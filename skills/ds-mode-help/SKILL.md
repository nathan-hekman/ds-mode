---
name: ds-mode-help
description: Quick-reference card for DS Mode — modes, theme, commands, where files go. One-shot display, not a persistent mode. Trigger when user asks "/ds-mode-help", "what does ds-mode do", "how do I use ds mode", or "ds mode help".
---

# DS Mode Help

Display this reference card when invoked. One-shot — do NOT change any state, write flag files, or persist anything. Output in plain prose (no caveman compression) so the card is readable as a reference.

## What DS Mode does

A Claude Code plugin that adds two things to non-trivial replies:

1. A plain-English **TLDR block** at the bottom of the message — 3 bullets max, 12 words each, ELI8.
2. A **visual HTML one-pager** opened in your browser when the reply is a decent length. Illustration-first — hero SVG + captioned tiles, not boxes of text. Adapts to your OS dark-mode preference automatically (or pin it via `/ds-mode dark` / `/ds-mode light`).

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
| **full** | TLDR + auto HTML one-pager when the reply is a decent length. **Default.** |
| **off** | Disabled this session. Hooks emit nothing. |

The active mode is set per-session via `/ds-mode lite|full` and persists in `$CLAUDE_CONFIG_DIR/.ds-mode-active`.

## Theme

The HTML one-pager adapts to your OS dark-mode preference by default. You can pin it explicitly:

| Command | Behavior |
|---------|----------|
| `/ds-mode dark` | Force dark palette on every one-pager. |
| `/ds-mode light` | Force light palette on every one-pager. |
| `/ds-mode auto` | Follow OS preference (default). |

Theme persists in `$CLAUDE_CONFIG_DIR/.ds-mode-theme`.

## Commands

| Command | What it does |
|---------|-------------|
| `/ds-mode` | Confirm DS Mode is active at the default mode. |
| `/ds-mode lite` | Switch to lite mode (TLDR only). |
| `/ds-mode full` | Switch to full mode (TLDR + auto HTML). |
| `/ds-mode on` | Re-enable at default mode. |
| `/ds-mode off` | Disable for this session. |
| `/ds-mode dark` / `/ds-mode light` / `/ds-mode auto` | Pin or auto-follow the OS theme for the HTML one-pager. |
| `/ds-mode <your question>` | Answer the question AND force the visual HTML one-pager for this turn — works in both lite and full mode. |
| `/ds-mode-help` | This card. |

## Natural-language triggers

- "stop ds mode" / "ds mode off" / "disable ds mode" — disable for the session
- "ds mode on" / "activate ds mode" / "turn on ds mode" — re-enable at default

## Configure default

DS Mode starts in `full` mode by default. To change the defaults for new sessions, set env vars:

```bash
export DS_MODE_DEFAULT=lite    # start in lite mode
export DS_MODE_DEFAULT=off     # start disabled
export DS_MODE_THEME=dark      # default theme to dark
export DS_MODE_THEME=light     # default theme to light
```

Add to your shell rc to make it stick. The installer can write these for you with `./install.sh --default-mode lite`, `./install.sh --default-off`, etc.

## Updates

DS Mode checks GitHub once every 24 hours for a newer plugin release in the background. When a newer version is available you'll see two ambient hints — never in the answer:

- The statusline chip becomes `DS:full ↑` (or `DS:lite ↑`) — the up-arrow is the "update available" mark.
- The SessionStart context shows a one-line note: `DS Mode vX.Y.Z is available — run \`claude plugin update ds-mode@ds-mode\` and restart Claude Code to pick it up.`

The TLDR block never mentions updates. Update messaging stays in the chrome, not in the content. To take the update:

```bash
claude plugin update ds-mode@ds-mode
# then restart Claude Code (or start a new session) so the new SessionStart hook fires
```

Network failures are silent — a missed check just means you'll find out one session later. To disable the check entirely, delete the cache file: `rm $CLAUDE_CONFIG_DIR/.ds-mode-update-check`. (It will re-create on next session unless you also `chmod 000` the directory or set `DS_MODE_NO_UPDATE_CHECK=1` — TODO if there's demand.)

## Where files go

| Path | Purpose |
|------|---------|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | Flag — active mode (`lite` or `full`). |
| `$CLAUDE_CONFIG_DIR/.ds-mode-theme` | Theme override (`auto`, `light`, `dark`). |
| `$CLAUDE_CONFIG_DIR/.ds-mode-tone` | Tone override (`default`, `surfer`). |
| `$CLAUDE_CONFIG_DIR/.ds-mode-installed` | Sentinel — written on first run so a user-chosen disable state survives sessions. |
| `$CLAUDE_CONFIG_DIR/.ds-mode-update-check` | Timestamp of the last update check (24h TTL). |
| `$CLAUDE_CONFIG_DIR/.ds-mode-update-available` | Latest version string when a newer release exists. |
| `$TMPDIR/dsmode-summary-<timestamp>.html` | Auto-generated one-pagers (ephemeral). |
| `$TMPDIR/dsmode-summary-<timestamp>.png` | Sibling screenshot when the stamper was called with `--screenshot`. |

DS Mode never writes into your project tree.

## Uninstall

```bash
claude plugin uninstall ds-mode@ds-mode
claude plugin marketplace remove ds-mode
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" \
      "$CLAUDE_CONFIG_DIR/.ds-mode-theme" \
      "$CLAUDE_CONFIG_DIR/.ds-mode-tone" \
      "$CLAUDE_CONFIG_DIR/.ds-mode-installed"
```

## More

- Repository: https://github.com/nathan-hekman/ds-mode
- Install reference: https://github.com/nathan-hekman/ds-mode/blob/main/INSTALL.md
