---
name: ds-mode-user-flows
description: Generate an HTML + JSON document mapping the main user-facing flows of the current project from an outcome perspective (no technical jargon). Use when the user asks for "user flows", "/ds-mode-user-flows", "show me how users use this app", or "what does this project do for users".
---

# /ds-mode-user-flows

Generate two artifacts for the current project:
- **HTML one-pager** showing 3-7 main user-facing flows as horizontal step diagrams
- **JSON companion** — same data, machine-readable for downstream tooling

Plain English only. No technical jargon. Outcome-focused.

## How to gather the flows

This is multi-file project exploration. **Spawn an Explore subagent** via the Agent tool to do the discovery. Do not read 10+ files yourself in the main thread.

Subagent prompt template:

> Map the main user-facing flows of the project rooted at `<cwd>`. Read README, CLAUDE.md, package.json/pyproject.toml/Cargo.toml/etc, and the top-level entry-point file(s). Identify 3-7 distinct flows. For each flow return JSON:
>
> ```json
> {
>   "name": "short title (e.g. 'Look up a card price')",
>   "persona": "who does this (e.g. 'card collector on iPhone')",
>   "trigger": "what they want (plain English, 1 sentence)",
>   "steps": [
>     {"action": "what the user does", "system_response": "what they see in response"}
>   ],
>   "outcome": "what they end up with"
> }
> ```
>
> Plain English everywhere. No technical jargon. No internal architecture. Just the user's experience.
>
> Return only the JSON array of flow objects, nothing else.

## What to produce

After the subagent returns the JSON:

1. Parse it. Sanity-check at least one flow has `name`, `persona`, `steps`.
2. Generate the HTML: each flow is a horizontal step diagram. Persona chip on the left, step boxes left-to-right with arrows, outcome chip on the right. Use `/impeccable` styling. ≤700px tall per page; multi-flow doc can scroll.
3. Save the HTML to: `${TMPDIR:-/tmp}/dsmode-user-flows-<projectslug>-$(date +%Y%m%d-%H%M%S).html`
4. Save the JSON to: `${TMPDIR:-/tmp}/dsmode-user-flows-<projectslug>-$(date +%Y%m%d-%H%M%S).json`
5. `open` the HTML via Bash.
6. Reply: **"Opened user-flow doc in your browser. JSON at `<json-path>`."** Single line.

`<projectslug>` is the basename of `git rev-parse --show-toplevel` (or `$PWD` if not a git repo), sanitized to `[a-z0-9-]+`.

## TLDR block

Skip the TLDR block on this skill's reply — the HTML IS the deliverable.

## When to refuse

If the project root has fewer than 3 source files or no README/CLAUDE.md, reply: "Not enough project material to map user flows yet. Add a README first." Do not invoke the subagent.
