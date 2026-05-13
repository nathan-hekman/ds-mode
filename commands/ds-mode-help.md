---
description: Show a quick-reference card for all DS Mode modes, skills, commands, and configuration. One-shot display — does not change mode.
---

Invoke the `ds-mode-help` skill.

The skill prints a quick-reference card covering:

- What DS Mode does
- All four modes (`lite`, `full`, `visual`, `off`) and how to switch them
- All slash commands (`/dsm`, `/ds-mode-session-summary`, `/ds-mode-user-flows`, `/ds-mode-help`)
- Natural-language triggers ("ds mode on", "stop ds mode")
- How to configure the default mode (`DS_MODE_DEFAULT` env var)
- Where files are written
- How to uninstall
- Repository + INSTALL.md + design-spec links

One-shot — does NOT change mode or persist anything. See `skills/ds-mode-help/SKILL.md` for the full ruleset.
