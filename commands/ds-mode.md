---
description: Activate DS Mode — plain-English TLDR + conditional one-pager HTML at the bottom of every Claude Code reply. /ds-mode <mode> sets lite | full | visual | off.
---

Activate **DS Mode**. Mode (default `full`) persists for the session via `$CLAUDE_CONFIG_DIR/.ds-mode-active` and is re-anchored each turn by the plugin's UserPromptSubmit hook.

Usage:

- `/ds-mode` — activate at default (`full`)
- `/ds-mode lite` — TLDR block only, no HTML
- `/ds-mode full` — TLDR + HTML when prime directive fires (default)
- `/ds-mode visual` — TLDR + HTML on every non-trivial reply
- `/ds-mode off` — disable for the rest of this session

Alias: `/dsm` (identical behavior). See `skills/ds-mode/SKILL.md` for the full ruleset.

To make a particular mode the install-time default for every new session, set `DS_MODE_DEFAULT=<mode>` in your shell environment before launching Claude Code.
