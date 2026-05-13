---
description: Generate a one-page HTML summary of the current Claude Code session's conversation, in plain English. Opens in your browser.
---

Invoke the `ds-mode-session-summary` skill.

The skill reads the current session's transcript, distills it into 3-6 plain-English bullets plus one inline-SVG flow diagram, saves an HTML one-pager to `$TMPDIR/dsmode-session-summary-<timestamp>.html`, and `open`s it in the browser. Reply is one line: "Opened session summary in your browser."

See `skills/ds-mode-session-summary/SKILL.md` for the full ruleset.
