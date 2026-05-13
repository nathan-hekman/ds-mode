---
name: ds-mode-help
description: Quick-reference card for all DS Mode modes, skills, and commands. One-shot display, not a persistent mode. Trigger when user asks "/ds-mode-help", "/dsm help", "what ds-mode commands", "how do I use ds mode", or "ds mode help".
---

# DS Mode Help

Display this reference card when invoked. One-shot — do NOT change mode, write flag files, or persist anything. Output in plain prose (no caveman or extreme compression) so the card is readable as a reference.

## What DS Mode is

A Claude Code plugin that adds two things to non-trivial replies:

1. A plain-English **TLDR block** at the bottom of the message — 3 bullets max, 12 words each, ELI8.
2. An auto-generated **one-page HTML summary** opened in your browser when the prime directive fires (length / density / decision / blocker triggers), or on every reply when `visual` mode is on.

## Modes

| Mode | Trigger | What changes |
|------|---------|-------------|
| **lite** | `/dsm lite` | TLDR block only. No HTML one-pager. |
| **full** | `/dsm` or `/dsm full` | TLDR + HTML one-pager when prime directive triggers fire. **Default.** |
| **visual** | `/dsm visual` | TLDR + HTML one-pager on every non-trivial reply (>3 sentences). |
| **off** | `/dsm off` | Disabled this session. Flag removed; hooks emit nothing. |

Mode persists until changed via `/dsm <mode>` or session end (and even then survives — the flag file at `$CLAUDE_CONFIG_DIR/.ds-mode-active` is read by the SessionStart hook on the next launch).

## Commands

| Command | What it does |
|---------|-------------|
| `/ds-mode` or `/dsm` | Activate at default mode (`full`). |
| `/dsm lite\|full\|visual` | Set the mode. |
| `/dsm off` | Disable for this session. |
| `/ds-mode-session-summary` | Generate a one-page HTML summary of the current Claude Code session and open it in the browser. |
| `/ds-mode-user-flows` | Generate an HTML + JSON map of the current project's main user-facing flows (persona, steps, outcome) in plain English. Spawns an Explore subagent to map the project. |
| `/ds-mode-help` | This card. |

## Natural-language triggers

- "ds mode on" / "activate ds mode" / "turn on ds mode" — activate at default mode
- "stop ds mode" / "ds mode off" / "disable ds mode" — disable for the session
- "talk like ds mode" — activate at default mode

## Configure default mode

Default mode = `full`. To change it across sessions:

```bash
export DS_MODE_DEFAULT=lite      # or full | visual
```

Resolution: `$DS_MODE_DEFAULT` env var > hardcoded fallback (`full`). The installer adds the export to your shell's rc file (`~/.zshrc`, `~/.zshenv`, `~/.bashrc`, or `~/.bash_profile`).

## Where files go

| Path | Purpose |
|------|---------|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | Current mode (`lite`/`full`/`visual`, or absent for `off`). |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | One-time backup of pre-install settings.json. |
| `$TMPDIR/dsmode-summary-<timestamp>.html` | Auto one-pagers fired during normal chat (ephemeral). |
| `$TMPDIR/dsmode-session-summary-<timestamp>.html` | `/ds-mode-session-summary` output. |
| `$TMPDIR/dsmode-user-flows-<projectslug>-<timestamp>.{html,json}` | `/ds-mode-user-flows` output. |

DS Mode never writes into your project tree or homedir without explicit opt-in.

## Uninstall

```bash
rm -rf "$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode"
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active"
# Optionally: cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
# Remove the DS_MODE_DEFAULT export from your shell rc if you don't want it.
```

## More

- Repository: https://github.com/nathan-hekman/ds-mode
- Install reference: https://github.com/nathan-hekman/ds-mode/blob/main/INSTALL.md
- Design spec: https://github.com/nathan-hekman/ds-mode/blob/main/docs/specs/2026-05-13-v2-caveman-mirror-design.md
