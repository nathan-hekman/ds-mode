---
description: Generate HTML + JSON describing the main user-facing flows of the current project, in plain English. Opens HTML in your browser.
---

Invoke the `ds-mode-user-flows` skill.

The skill spawns an Explore subagent to map 3-7 user-facing flows (persona, trigger, steps, outcome), then renders them as a horizontal-step-diagram HTML one-pager plus a JSON companion. Outputs saved to `$TMPDIR/dsmode-user-flows-<projectslug>-<timestamp>.{html,json}`.

See `skills/ds-mode-user-flows/SKILL.md` for the full ruleset.
