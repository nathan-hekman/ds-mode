# DS Mode v2 — Caveman-Mirror Plugin Refactor

> **⚠ SUPERSEDED.** This document describes the v2 (modes: lite / full / visual / off) design that was replaced by the v3 simplified-to-on/off design. The `/dsm` alias, `ds-mode-user-flows`, and `ds-mode-session-summary` skills no longer exist. See [README.md](../../README.md) and [rules/ds-mode.md](../../rules/ds-mode.md) for current behavior. Kept for historical reference.

**Date:** 2026-05-13
**Author:** Nathan Hekman
**Status:** Superseded

## TL;DR

- Convert DS Mode from output-style + bare slash commands into a Claude Code **plugin** (matches caveman's marketplace + plugin.json layout).
- Replace fragile `outputStyle` mechanism with **SessionStart + UserPromptSubmit hooks** that inject the ruleset every session and re-anchor it every turn (compression-resilient).
- Add **mode toggle**: `/dsm lite|full|visual|off`. `visual` replaces the old `strict` concept — HTML on every non-trivial response.
- Add two new skills: **`/ds-mode-show`** (one-pager recap of current session) and **`/ds-mode-user-flows`** (HTML+JSON of main user flows for current project, plain English).
- **No bundled subagent definitions** (no cavecrew analog). Skills MAY invoke the Agent tool at runtime when work justifies it: `/ds-mode-user-flows` spawns an Explore subagent for multi-file project mapping; `/ds-mode-show` stays single-threaded.
- Mirror caveman's README **Install** + **What You Get** sections + standalone **INSTALL.md**. Scope adapters narrower — Claude Code is primary; Cursor/Copilot/Codex stay as rule-file adapters.

## Why caveman-style and not explanatory-output-style?

Anthropic's [`explanatory-output-style`](https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style) plugin is the minimal pattern: a single SessionStart hook that injects instructions once per session. Considered as a template but rejected because DS Mode needs more:

| Need | explanatory (hook only) | DS Mode v2 (hooks + skills) |
|---|:-:|:-:|
| Inject ruleset every session | ✓ | ✓ |
| Re-anchor every turn (survive compression) | ✗ | ✓ via UserPromptSubmit |
| Per-session toggle (`/dsm off`) | ✗ — disable whole plugin | ✓ via flag file |
| Mode switching (`lite`/`full`/`visual`) | ✗ | ✓ |
| User-invoked utilities (`/ds-mode-show`, `/ds-mode-user-flows`) | ✗ | ✓ skills |
| Statusline indicator | ✗ | ✓ |

Cost: more code surface to maintain (~2 hooks + 3 skills + 4 commands vs. 1 shell script) and higher per-turn token spend (the prime-directive reminder rides every UserPromptSubmit). Worth it — the whole reason for v2 is that DS Mode silently fails today and has no toggle.

**Why not full caveman parity?** Caveman ships **bundled subagent definitions** (`cavecrew-investigator/reviewer/builder` agent personas). Those exist because caveman's point is token *compression* at the subagent boundary — Explore-style queries return ~60% fewer tokens to the main thread. DS Mode does the opposite (ADDS TLDR + HTML to outputs); no upstream work to compress. **Skip bundled subagent definitions.**

Separately, the DS Mode skills MAY invoke the Agent tool at runtime when the work itself benefits from a subagent:

| Skill | Runtime subagent? | Why |
|---|:-:|---|
| `/ds-mode-show` | no | Single file read (session transcript) → distill → render HTML. Lives in main thread. |
| `/ds-mode-user-flows` | yes (Explore) | Multi-file project mapping (README + CLAUDE.md + entry points + manifests). Per house rule: 3+ file reads → spawn Explore. Subagent returns structured flow JSON; main thread renders HTML/JSON from it. |

## Why

1. Current install relies on `"outputStyle": "DS Mode"` in `~/.claude/settings.json`. On the author's own machine the value is currently `"Dipsh*t Mode"` (stale rename) → DS Mode is silently inactive. Name-string matching is brittle.
2. Even when matched, output-style instructions drift after context compression. The model "forgets" the HTML prime directive halfway through long sessions. Caveman's hook-injection approach survives this because UserPromptSubmit re-emits a short reminder every turn.
3. No per-session toggle today. User must edit settings.json to turn off. Caveman has `/caveman off` / `/caveman lite` etc.
4. No statusline indicator. User cannot tell at a glance whether DS Mode is active.
5. Plugin format gives `${CLAUDE_PLUGIN_ROOT}` substitution → hooks resolve correctly regardless of where the user clones the repo.

## Repo Layout (final)

```
ds-mode/
├── README.md                           # caveman-style: Install + What You Get + Usage + Modes
├── INSTALL.md                          # standalone install reference (matches caveman/INSTALL.md)
├── LICENSE
├── SECURITY.md
├── .claude-plugin/
│   ├── marketplace.json                # marketplace manifest, name="ds-mode"
│   └── plugin.json                     # SessionStart + UserPromptSubmit hook registration
├── hooks/
│   ├── ds-mode-activate.js             # SessionStart — reads skills/ds-mode/SKILL.md, filters by active mode
│   ├── ds-mode-tracker.js              # UserPromptSubmit — /dsm command parsing, flag updates, NL triggers
│   ├── ds-mode-config.js               # shared: getDefaultMode, safeWriteFlag, readFlag, VALID_MODES
│   └── ds-mode-statusline.sh           # prints "DS:full" / "DS:visual" / "DS:lite" / (nothing if off)
├── skills/
│   ├── ds-mode/
│   │   └── SKILL.md                    # canonical ruleset — single source of truth
│   ├── ds-mode-show/
│   │   └── SKILL.md
│   └── ds-mode-user-flows/
│       └── SKILL.md
├── commands/
│   ├── ds-mode.md                      # /ds-mode (full form)
│   ├── dsm.md                          # alias
│   ├── ds-mode-show.md
│   └── ds-mode-user-flows.md
├── install.sh                          # bash installer (--minimal | --with-hooks default on | --dry-run | --force | --plugin-only)
├── install-claude-code.sh              # one-line web installer
├── install-all.sh                      # KEEP — multi-tool dispatcher
├── adapters/                           # KEEP existing cursor/copilot/codex rule-file generators
└── docs/
    ├── specs/
    │   └── 2026-05-13-v2-caveman-mirror-design.md   # this doc
    └── install-troubleshooting.md
```

## Modes

| Mode    | Behavior                                                                                |
|---------|-----------------------------------------------------------------------------------------|
| `lite`  | TLDR block only at bottom of non-trivial responses. No HTML.                            |
| `full`  | **Default.** TLDR + HTML when prime directive fires (length/density/decision/blocker).  |
| `visual`| TLDR + HTML on **every** non-trivial response (>3 sentences). Replaces old `strict`.    |
| `off`   | Disabled this session. Flag file removed; hooks emit nothing.                           |

Commands:
- `/dsm` → activate at default (`full`)
- `/dsm lite|full|visual|off`
- `/ds-mode` (longer form, same behavior)
- `/ds-mode-show` → invokes ds-mode-show skill
- `/ds-mode-user-flows` → invokes ds-mode-user-flows skill
- Natural language: "talk like ds mode", "ds mode", "stop ds mode"

## Hook Mechanics (mirror caveman)

**SessionStart (`ds-mode-activate.js`):**
1. Read `$CLAUDE_PLUGIN_ROOT/hooks/ds-mode-config.js` for mode resolution.
2. If mode = `off`, delete flag file, emit nothing, exit.
3. Else write flag file `$CLAUDE_CONFIG_DIR/.ds-mode-active` with current mode.
4. Read `$CLAUDE_PLUGIN_ROOT/skills/ds-mode/SKILL.md`, strip frontmatter, filter mode-specific rows, emit as SessionStart additionalContext prefixed with `DS MODE ACTIVE — mode: <mode>`.

**UserPromptSubmit (`ds-mode-tracker.js`):**
1. Parse user prompt for `/dsm`, `/ds-mode`, `/dsm-show`, `/dsm-flow`, and NL triggers.
2. On mode switch: rewrite flag file, emit confirmation.
3. On every prompt: emit short reminder `DS MODE ACTIVE (<mode>). TLDR + (HTML per prime directive\|HTML every response\|TLDR only). Brand label "DS Mode".`

**Statusline:** reads flag file, prints `DS:<mode>` chip. Empty when off.

## New Skill — ds-mode-show

**Purpose:** Generate a single-page HTML recap of the current Claude Code session's conversation in plain English.

**Behavior:**
1. Resolve session transcript via `$CLAUDE_TRANSCRIPT_PATH` (passed in hook context) or fall back to most-recent file in `~/.claude/projects/<cwd-slug>/`.
2. Read the transcript, extract user prompts + final assistant messages (skip tool calls/system reminders).
3. Distill into 3-6 plain-English bullets ("here's what we discussed"), one inline-SVG flow diagram, and optional next-step section.
4. Save `/tmp/dsmode-recap-YYYYMMDD-HHMMSS.html`, `open` it.
5. Reply: "Opened session recap in your browser." Single line.

Uses `/impeccable` styling principles (same as base ds-mode HTML pages).

## New Skill — ds-mode-user-flows

**Purpose:** Generate HTML+JSON describing the **main user-facing flows** of the current project from an outcome perspective. No technical jargon.

**Behavior:**
1. Detect project root via `git rev-parse --show-toplevel` or `$PWD`.
2. Read README, CLAUDE.md, top-level package.json/pyproject.toml, primary entry-point files (limited to ~10 files, no deep dive).
3. Identify 3-7 main flows. For each:
   - **Persona** (who uses this)
   - **Trigger** (what they want)
   - **Steps** (plain English — "open the app", "tap search", "see results")
   - **Outcome** (what they get)
4. Generate two files in `/tmp/`:
   - `dsmode-flow-<projectname>-<timestamp>.html` — horizontal step diagram per flow
   - `dsmode-flow-<projectname>-<timestamp>.json` — machine-readable for downstream tooling
5. `open` the HTML. Reply: "Opened flow doc in your browser. JSON at <path>."

## Install Approach (mirror caveman)

**One-liner (README primary):**
```bash
curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install.sh | bash
```

**Local clone:**
```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                # plugin + hooks + statusline (default)
./install.sh --minimal      # skip hooks/statusline, plugin only
./install.sh --plugin-only  # for Claude Code plugin marketplace install path
```

**What the installer does** (Claude Code path):
1. Detect existing `~/.claude/settings.json`. Back it up to `settings.json.bak.preDSmode`.
2. Strip stale `"outputStyle": "Dipsh*t Mode"` / `"outputStyle": "DS Mode"` (deprecated path).
3. Copy `hooks/*` to `~/.claude/hooks/` (or register plugin via marketplace.json).
4. Merge SessionStart + UserPromptSubmit hook entries into settings.json (preserving caveman hooks).
5. Optionally install statusline element.
6. Write `~/.claude/.ds-mode-active` = `full`.
7. Print "What You Get" recap.

**Adapter paths** (Cursor / Copilot / Codex): unchanged — keep existing rule-file generators in `adapters/`. Narrower scope than caveman; we explicitly do not auto-detect 30+ agents.

## README Section Mirror

Mirror caveman's:
- `## Install` — one-liner + flag table
- `## What You Get` — matrix table: Claude Code / Cursor / Copilot / Codex columns × feature rows (TLDR, HTML one-pager, mode switching, `/ds-mode-show`, `/ds-mode-user-flows`, statusline)
- `## Usage` — `/dsm`, NL triggers, `/dsm off` to disable
- `## Modes` — lite / full / visual table

Link to standalone `INSTALL.md` at top of Install section.

## Local Fix for Nathan (one-time, after merge)

1. Run new `install.sh` from cloned repo.
2. Installer cleans stale `outputStyle: "Dipsh*t Mode"` from settings.json.
3. New hooks fire on next Claude Code restart → DS Mode active in every session by default.
4. Verify: `cat ~/.claude/.ds-mode-active` → `full`.

## Filesystem Layout

DS Mode produces HTML files (caveman does not). All output paths defined explicitly to avoid surprises.

| File | Location | Lifetime |
|---|---|---|
| Mode flag | `$CLAUDE_CONFIG_DIR/.ds-mode-active` | persistent until `/dsm off` |
| Pre-install settings.json backup | `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | persistent (one-time on install) |
| Auto one-pager (prime-directive fires during normal chat) | `$TMPDIR/dsmode-summary-<YYYYMMDD-HHMMSS>.html` | ephemeral (reboot-cleared) |
| `/ds-mode-show` recap | `$TMPDIR/dsmode-recap-<YYYYMMDD-HHMMSS>.html` | ephemeral |
| `/ds-mode-user-flows` HTML + JSON | `$TMPDIR/dsmode-user-flows-<projectslug>-<YYYYMMDD-HHMMSS>.{html,json}` | ephemeral |

Rules:
- Use `$TMPDIR` env var (macOS-correct); fall back to `/tmp` if unset.
- Never write HTML into project repo or homedir without explicit user opt-in.
- Mode flag + settings backup are the only persistent files.
- Future opt-in (deferred): `/ds-mode-user-flows --save` writing to `<project-root>/docs/ds-mode-user-flows.{html,json}`. Out of scope for v1.

## Out of Scope

- Multi-agent auto-detect (caveman scope, not ours).
- MCP middleware equivalent of `caveman-shrink` (DS Mode adds context, doesn't compress it).
- `cavecrew`-style subagent suite. Defer.
- Per-repo rule files via `--with-init`. Defer until users ask.

## Open Questions

None — all approach decisions locked (1a/2a + visual/show/flow/plugin per author confirmation).
