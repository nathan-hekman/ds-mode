# DS Mode v2 Implementation Plan

> **⚠ SUPERSEDED.** This is the v2 (modes: lite / full / visual / off) implementation plan, replaced by the v3 simplified-to-on/off design. Many components named here (`/dsm`, `ds-mode-user-flows`, `ds-mode-session-summary`, `VALID_MODES`) no longer exist. See [README.md](../../README.md) for current behavior. Kept for historical reference.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor DS Mode from a fragile `outputStyle` setting into a Claude Code plugin with SessionStart + UserPromptSubmit hooks, mode toggle, statusline, and two new user-invocable skills (`/ds-mode-show`, `/ds-mode-user-flows`).

**Architecture:** Caveman-mirrored plugin layout (minus bundled subagents). `.claude-plugin/{marketplace.json, plugin.json}` registers two hooks. SessionStart hook reads `skills/ds-mode/SKILL.md` and injects it filtered by active mode. UserPromptSubmit hook parses `/dsm` commands and re-anchors the prime directive each turn. Mode persisted via flag file at `$CLAUDE_CONFIG_DIR/.ds-mode-active`. All HTML outputs land in `$TMPDIR`.

**Tech Stack:** Node.js (hooks), Bash (installers + statusline), Markdown (SKILL.md + commands). Targets Claude Code's plugin system.

**Spec:** [2026-05-13-v2-caveman-mirror-design.md](./2026-05-13-v2-caveman-mirror-design.md)

**Repo:** `/Users/andreahekman/Documents/Other Projects/ds-mode` (github: nathan-hekman/ds-mode), branch `main`.

---

## File Structure

```
ds-mode/
├── .claude-plugin/
│   ├── marketplace.json                    [CREATE]
│   └── plugin.json                         [CREATE]
├── hooks/
│   ├── ds-mode-config.js                   [CREATE] shared helpers
│   ├── ds-mode-activate.js                 [CREATE] SessionStart
│   ├── ds-mode-tracker.js                  [CREATE] UserPromptSubmit
│   └── ds-mode-statusline.sh               [CREATE]
├── skills/
│   ├── ds-mode/
│   │   └── SKILL.md                        [CREATE] (content moved from output-styles/ds-mode.md)
│   ├── ds-mode-show/
│   │   └── SKILL.md                        [CREATE]
│   └── ds-mode-user-flows/
│       └── SKILL.md                        [CREATE]
├── commands/
│   ├── ds-mode.md                          [MODIFY] drop --permanent talk, add /dsm modes
│   ├── dsm.md                              [MODIFY] same
│   ├── ds-mode-show.md                     [CREATE]
│   └── ds-mode-user-flows.md               [CREATE]
├── output-styles/
│   └── ds-mode.md                          [DELETE] replaced by skills/ds-mode/SKILL.md
├── install.sh                              [REWRITE]
├── install-claude-code.sh                  [REWRITE]
├── README.md                               [REWRITE] caveman-style Install + What You Get + Modes
├── INSTALL.md                              [CREATE]
└── .gitignore                              [MODIFY] add .ds-mode-active if test runs locally
```

---

## Task 1: Scaffold plugin manifests

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1.1: Create marketplace.json**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "ds-mode",
  "description": "Plain-English TLDR at the bottom of every reply, plus auto-generated one-page HTML summaries when answers run long or technical.",
  "owner": {
    "name": "Nathan Hekman",
    "url": "https://github.com/nathan-hekman"
  },
  "plugins": [
    {
      "name": "ds-mode",
      "description": "DS Mode — plain-English answers with pretty pictures.",
      "source": "./",
      "category": "productivity"
    }
  ]
}
```

- [ ] **Step 1.2: Create plugin.json**

```json
{
  "name": "ds-mode",
  "description": "Plain-English TLDR + auto HTML one-pager for non-trivial Claude Code replies. Toggle per-session via /dsm. Modes: lite | full | visual | off.",
  "author": {
    "name": "Nathan Hekman",
    "url": "https://github.com/nathan-hekman"
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/ds-mode-activate.js\"",
            "timeout": 5,
            "statusMessage": "Loading DS Mode..."
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/ds-mode-tracker.js\"",
            "timeout": 5,
            "statusMessage": "Tracking DS Mode..."
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 1.3: Verify both files parse as JSON**

Run: `python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))" && python3 -c "import json; json.load(open('.claude-plugin/plugin.json'))"`
Expected: no output, exit code 0.

- [ ] **Step 1.4: Commit**

```bash
git add .claude-plugin/marketplace.json .claude-plugin/plugin.json
git commit -m "feat: add Claude Code plugin manifest (marketplace + plugin.json)

Registers DS Mode as a plugin with SessionStart + UserPromptSubmit hooks.
Sets up the caveman-mirrored layout that replaces the brittle outputStyle
mechanism. See docs/specs/2026-05-13-v2-caveman-mirror-design.md."
```

---

## Task 2: Shared hook config module

**Files:**
- Create: `hooks/ds-mode-config.js`

- [ ] **Step 2.1: Write the module**

```javascript
// hooks/ds-mode-config.js — shared utilities for DS Mode hooks
//
// Owns: valid mode list, default mode resolution, symlink-safe flag I/O.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['lite', 'full', 'visual', 'off'];
const DEFAULT_MODE = 'full';

// Resolve the configured default mode. Reads $DS_MODE_DEFAULT env var first
// (so installs can opt for `lite` start), then falls back to DEFAULT_MODE.
function getDefaultMode() {
  const envMode = (process.env.DS_MODE_DEFAULT || '').trim().toLowerCase();
  if (envMode && VALID_MODES.includes(envMode)) return envMode;
  return DEFAULT_MODE;
}

// Resolve $CLAUDE_CONFIG_DIR with homedir fallback.
function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Symlink-safe flag write: refuses to follow a pre-existing symlink at the
// target path (defense against a malicious symlink clobbering a real file).
function safeWriteFlag(flagPath, mode) {
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) {
      // Refuse to write through a symlink — silently no-op.
      return false;
    }
  } catch (e) {
    // File does not exist yet — fine.
  }
  const tempPath = `${flagPath}.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, mode + '\n', { mode: 0o600 });
  fs.renameSync(tempPath, flagPath);
  return true;
}

function readFlag(flagPath) {
  try {
    return fs.readFileSync(flagPath, 'utf8').trim();
  } catch (e) {
    return null;
  }
}

function deleteFlag(flagPath) {
  try { fs.unlinkSync(flagPath); } catch (e) {}
}

module.exports = {
  VALID_MODES,
  DEFAULT_MODE,
  getDefaultMode,
  claudeConfigDir,
  safeWriteFlag,
  readFlag,
  deleteFlag,
};
```

- [ ] **Step 2.2: Sanity-check require works**

Run: `node -e "console.log(require('./hooks/ds-mode-config.js').VALID_MODES)"`
Expected: `[ 'lite', 'full', 'visual', 'off' ]`

- [ ] **Step 2.3: Commit**

```bash
git add hooks/ds-mode-config.js
git commit -m "feat(hooks): shared config module for DS Mode hooks

Owns valid mode list, default mode resolution (with DS_MODE_DEFAULT env
override), and symlink-safe flag file I/O. Both SessionStart and
UserPromptSubmit hooks consume this."
```

---

## Task 3: Author canonical SKILL.md (single source of truth)

**Files:**
- Create: `skills/ds-mode/SKILL.md`
- Delete: `output-styles/ds-mode.md` (after content transferred)

- [ ] **Step 3.1: Copy current ruleset into SKILL.md with mode-row table**

Take the existing prose from `output-styles/ds-mode.md` and adapt it for plugin use. Add a `## Modes` table near the top so `ds-mode-activate.js` can filter rows by active level. Write the file with this frontmatter and structure:

```markdown
---
name: ds-mode
description: Plain-English TLDR at the bottom of every non-trivial Claude Code response, plus auto-generated one-page HTML summaries when answers run long, technical, decision-laden, or block on a question.
---

# DS Mode

You are Claude Code in **DS Mode**. User is a product manager. Substance up top, plain-English TLDR at bottom, mandatory HTML one-pager for non-trivial answers.

## Modes

| **mode** | What changes |
|---|---|
| **lite** | TLDR block at bottom of non-trivial replies. No HTML one-pager, ever. |
| **full** | TLDR + HTML one-pager when the prime directive triggers fire (default). |
| **visual** | TLDR + HTML one-pager on EVERY non-trivial response (>3 sentences). |
| **off** | Disabled. Hooks emit nothing. |

The active mode is set per-session via `/dsm <mode>` and persists in `$CLAUDE_CONFIG_DIR/.ds-mode-active`.

## THE PRIME DIRECTIVE — HTML IS MANDATORY (full mode)

[copy the existing "Hard rule, zero exceptions" body from output-styles/ds-mode.md verbatim]

## Visual mode override

In **visual** mode, the HTML one-pager fires on EVERY response longer than ~3 sentences, regardless of whether the prime directive triggers fire. Use the closest matching flavor (summary / explainer / decision / quiz) based on response content. The cost of building an unneeded card is one Bash call — the benefit is consistent visual deliverables.

## TLDR rule

[copy verbatim from current output-styles/ds-mode.md]

## HTML one-pager rule

[copy verbatim. Update save path to use $TMPDIR: `${TMPDIR:-/tmp}/dsmode-summary-YYYYMMDD-HHMMSS.html`]

## Lite mode override

In **lite** mode: skip HTML one-pagers entirely. TLDR block stays. Use this when you want the plain-English recap without browser pop-ups (e.g. driving terminal-heavy workflows).

## Caveman mode interaction

[copy verbatim]

## Explanatory mode interaction

[copy verbatim]

## Self-check before sending every response

[copy the existing self-check checklist verbatim, but reword item 1 to account for mode:
"1. **HTML — did I build it?** If mode is `full` and prime directive fires (body >3 sentences AND (heading|code block|A/B options|blocker|>=400 words)) OR mode is `visual` and body >3 sentences: I have built and `open`ed the HTML. Mode `lite` or `off`: skip."
]

## Brand label

Every reference in user-facing output reads "DS Mode" — no other expansion.
```

The point of this task is to make `skills/ds-mode/SKILL.md` the single source of truth. The hook reads it at runtime; the command files reference it; the output-style file is deleted in step 3.3.

- [ ] **Step 3.2: Verify frontmatter parses**

Run: `head -5 skills/ds-mode/SKILL.md`
Expected: opens with `---`, closes with `---`, has `name:` and `description:`.

- [ ] **Step 3.3: Delete the old output-style file**

```bash
git rm output-styles/ds-mode.md
rmdir output-styles 2>/dev/null || true
```

- [ ] **Step 3.4: Commit**

```bash
git add skills/ds-mode/SKILL.md
git commit -m "feat(skills): canonical ds-mode SKILL.md as single source of truth

Moves the ruleset from output-styles/ds-mode.md to skills/ds-mode/SKILL.md
and adds a mode table (lite/full/visual/off) so the SessionStart hook can
filter to the active level at runtime. Output-style file deleted — the
fragile outputStyle mechanism is being replaced by hook injection."
```

---

## Task 4: SessionStart hook — `ds-mode-activate.js`

**Files:**
- Create: `hooks/ds-mode-activate.js`

- [ ] **Step 4.1: Write the hook**

```javascript
#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Resolve active mode (from flag file, or default).
//   2. Write/refresh flag file at $CLAUDE_CONFIG_DIR/.ds-mode-active.
//   3. If mode != off, emit the DS Mode ruleset filtered to the active mode,
//      so Claude carries those instructions into the session.

const fs = require('fs');
const path = require('path');
const {
  getDefaultMode,
  claudeConfigDir,
  safeWriteFlag,
  readFlag,
  deleteFlag,
  VALID_MODES,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');

// Mode resolution: existing flag wins (user's per-session choice persists),
// otherwise fall back to the configured default.
const existing = readFlag(flagPath);
const mode = (existing && VALID_MODES.includes(existing)) ? existing : getDefaultMode();

if (mode === 'off') {
  deleteFlag(flagPath);
  process.stdout.write('OK');
  process.exit(0);
}

safeWriteFlag(flagPath, mode);

// Read the SKILL.md ruleset. Plugin install layout:
//   __dirname = <plugin_root>/hooks/
//   SKILL.md at <plugin_root>/skills/ds-mode/SKILL.md
const skillPath = path.join(__dirname, '..', 'skills', 'ds-mode', 'SKILL.md');
let skillContent = '';
try {
  skillContent = fs.readFileSync(skillPath, 'utf8');
} catch (e) {
  // Defensive: emit minimal fallback if the SKILL.md was moved.
  process.stdout.write(
    'DS MODE ACTIVE — mode: ' + mode + '\n' +
    'TLDR block at bottom of every non-trivial response. ' +
    'HTML one-pager fires per prime directive. Brand label: "DS Mode".'
  );
  process.exit(0);
}

// Strip YAML frontmatter.
const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');

// Filter the Modes table: keep header rows, drop non-active rows.
const filtered = body.split('\n').reduce((acc, line) => {
  const tableRowMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
  if (tableRowMatch) {
    if (tableRowMatch[1] === mode) acc.push(line);
    return acc;
  }
  acc.push(line);
  return acc;
}, []).join('\n');

process.stdout.write('DS MODE ACTIVE — mode: ' + mode + '\n\n' + filtered);
```

- [ ] **Step 4.2: Make it executable and smoke-test**

```bash
chmod +x hooks/ds-mode-activate.js
CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ mkdir -p /tmp/dsmode-test-$$ && CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ node hooks/ds-mode-activate.js | head -20
```

Expected: output starts with `DS MODE ACTIVE — mode: full` then the SKILL.md body.

```bash
# Test "off" path
echo "off" > /tmp/dsmode-test-$$/.ds-mode-active
CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ node hooks/ds-mode-activate.js
```

Expected: prints `OK`, flag file removed.

Clean up: `rm -rf /tmp/dsmode-test-*`

- [ ] **Step 4.3: Commit**

```bash
git add hooks/ds-mode-activate.js
git commit -m "feat(hooks): SessionStart hook activates DS Mode per session

Resolves mode (existing flag wins, falls back to default), writes the
flag file, then emits the filtered SKILL.md as session context. Off mode
deletes the flag and emits nothing — clean disable path."
```

---

## Task 5: UserPromptSubmit hook — `ds-mode-tracker.js`

**Files:**
- Create: `hooks/ds-mode-tracker.js`

- [ ] **Step 5.1: Write the hook**

```javascript
#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook
//
// Two jobs:
//   1. Parse the user's prompt for /dsm or /ds-mode mode-switch commands and
//      NL triggers ("ds mode on", "stop ds mode") — update the flag file.
//   2. On every prompt, re-emit a short "DS MODE ACTIVE" reminder so the
//      prime directive survives context compression mid-session.

const path = require('path');
const {
  getDefaultMode,
  claudeConfigDir,
  safeWriteFlag,
  readFlag,
  deleteFlag,
  VALID_MODES,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let prompt = '';
  try {
    const data = JSON.parse(input);
    prompt = (data.prompt || '').trim().toLowerCase();
  } catch (e) {
    // No prompt context — just emit reminder if mode active.
  }

  // 1. Mode-switch commands: /dsm, /dsm <mode>, /ds-mode, /ds-mode <mode>
  const slashMatch = /^\/(dsm|ds-mode)(?:\s+(\w+))?$/.exec(prompt);
  if (slashMatch) {
    const arg = (slashMatch[2] || '').toLowerCase();
    if (!arg) {
      safeWriteFlag(flagPath, getDefaultMode());
    } else if (arg === 'off') {
      deleteFlag(flagPath);
    } else if (VALID_MODES.includes(arg)) {
      safeWriteFlag(flagPath, arg);
    }
    // Fall through to emit reminder below.
  }

  // 2. NL triggers (defensive — slash commands are primary).
  if (/\b(stop|disable|turn off|deactivate)\b.*\bds[- ]?mode\b/.test(prompt)) {
    deleteFlag(flagPath);
  } else if (/\b(activate|enable|turn on|start)\b.*\bds[- ]?mode\b/.test(prompt) ||
             /\b(talk like|ds[- ]?mode)\b.*\b(mode|on|active)\b/.test(prompt)) {
    safeWriteFlag(flagPath, getDefaultMode());
  }

  // 3. Re-anchor reminder.
  const current = readFlag(flagPath);
  if (!current || current === 'off' || !VALID_MODES.includes(current)) {
    // No active mode — emit nothing.
    process.exit(0);
  }

  const reminder = {
    lite:   'DS MODE ACTIVE (lite). TLDR block at bottom of non-trivial replies. NO HTML one-pager. Brand label "DS Mode".',
    full:   'DS MODE ACTIVE (full). TLDR block at bottom of non-trivial replies. HTML one-pager fires when prime directive triggers fire (length/density/decision/blocker). Brand label "DS Mode".',
    visual: 'DS MODE ACTIVE (visual). TLDR block at bottom of every non-trivial reply. HTML one-pager fires on EVERY reply >3 sentences. Brand label "DS Mode".',
  };
  process.stdout.write(reminder[current]);
});
```

- [ ] **Step 5.2: Make it executable and smoke-test**

```bash
chmod +x hooks/ds-mode-tracker.js
CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ mkdir -p /tmp/dsmode-test-$$ && \
  echo '{"prompt":"/dsm visual"}' | CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ node hooks/ds-mode-tracker.js
cat /tmp/dsmode-test-$$/.ds-mode-active
```

Expected output: `DS MODE ACTIVE (visual)...` reminder string. Flag file contents: `visual`.

```bash
echo '{"prompt":"/dsm off"}' | CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ node hooks/ds-mode-tracker.js
test -f /tmp/dsmode-test-$$/.ds-mode-active && echo FAIL || echo OK
```

Expected: prints `OK` (flag removed, no reminder emitted).

Clean up: `rm -rf /tmp/dsmode-test-*`

- [ ] **Step 5.3: Commit**

```bash
git add hooks/ds-mode-tracker.js
git commit -m "feat(hooks): UserPromptSubmit hook for /dsm commands + per-turn reminder

Parses /dsm, /dsm <mode>, /ds-mode, /ds-mode <mode>, plus NL triggers
('stop ds mode', 'activate ds mode'). Updates the flag file and re-emits
a short prime-directive reminder every turn so the rules survive context
compression."
```

---

## Task 6: Statusline shell script

**Files:**
- Create: `hooks/ds-mode-statusline.sh`

- [ ] **Step 6.1: Write the script**

```bash
#!/usr/bin/env bash
# ds-mode-statusline.sh — emit a "DS:<mode>" chip when DS Mode is active.
# Empty output when mode is off / flag missing so the statusline collapses.

claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
flag="$claude_dir/.ds-mode-active"

if [[ -f "$flag" ]]; then
  mode="$(tr -d '[:space:]' < "$flag")"
  case "$mode" in
    lite|full|visual) printf "DS:%s" "$mode" ;;
    *) ;;
  esac
fi
```

- [ ] **Step 6.2: Make it executable and smoke-test**

```bash
chmod +x hooks/ds-mode-statusline.sh
mkdir -p /tmp/dsmode-test-$$ && echo "visual" > /tmp/dsmode-test-$$/.ds-mode-active
CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ hooks/ds-mode-statusline.sh
echo
```

Expected: `DS:visual`

```bash
rm /tmp/dsmode-test-$$/.ds-mode-active
CLAUDE_CONFIG_DIR=/tmp/dsmode-test-$$ hooks/ds-mode-statusline.sh; echo "<end>"
```

Expected: `<end>` (empty output then "<end>").

Clean up: `rm -rf /tmp/dsmode-test-*`

- [ ] **Step 6.3: Commit**

```bash
git add hooks/ds-mode-statusline.sh
git commit -m "feat(hooks): statusline script prints DS:<mode> chip when active

Empty when mode is off so the statusline collapses cleanly."
```

---

## Task 7: `/ds-mode-show` skill

**Files:**
- Create: `skills/ds-mode-show/SKILL.md`
- Create: `commands/ds-mode-show.md`

- [ ] **Step 7.1: Write the skill**

```markdown
---
name: ds-mode-show
description: Generate a single-page HTML recap of the current Claude Code session's conversation in plain English. Opens it in the browser. Use when the user asks for "a recap", "summary of what we talked about", "/ds-mode-show", or "show me what we did".
---

# /ds-mode-show

Generate a one-page HTML summary of the **current Claude Code session's conversation** in plain English. Save to `$TMPDIR` and `open` it.

## What to produce

A single self-contained HTML file with:

- **Title bar** — "Session Recap · DS Mode"
- **3-6 bullets** distilling what was discussed (plain English; a second-grader should get it)
- **One inline-SVG flow diagram** showing the arc of the conversation (start → key turns → outcome). Hand-drawn feel, muted palette, ≤200px tall.
- **Optional "Next steps" section** with 2-3 bullets if the conversation ended on a decision or pending question.

Apply `/impeccable` styling principles: no AI-slop gradients, no emoji walls, system font stack, ≤700px tall at 1024px wide, classy.

## How to find the transcript

Claude Code stores session transcripts at:
`~/.claude/projects/<cwd-slug>/<session-id>.jsonl`

Use `$CLAUDE_TRANSCRIPT_PATH` if the harness has populated it; otherwise glob the most recently modified `.jsonl` under the current project's slug directory. The cwd slug is the user's cwd with `/` → `-`.

## Steps

1. Resolve transcript path (env var preferred, glob fallback).
2. Read the JSONL. Each line is a message event. Extract:
   - User prompts (role=user, ignore system reminders)
   - Final assistant text per turn (last `text` block; ignore tool calls)
3. Distill into bullets. Translate jargon as you go ("endpoint" → "the part of the server that answers requests", "refactor" → "rewrite without changing what it does").
4. Generate the HTML inline.
5. Save to `${TMPDIR:-/tmp}/dsmode-recap-$(date +%Y%m%d-%H%M%S).html`.
6. `open` the file via Bash.
7. Reply with one line: **"Opened session recap in your browser."** No additional narrative.

## Stay in main thread

Do **not** spawn a subagent for this skill. The source data is one transcript file — Read it directly. The distillation benefits from full conversation context.

## TLDR block

Skip the TLDR block on this skill's reply — the HTML page IS the deliverable. One-line confirmation is enough.
```

- [ ] **Step 7.2: Write the command file**

```markdown
---
description: Generate a one-page HTML recap of the current Claude Code session's conversation, in plain English. Opens in your browser.
---

Invoke the `ds-mode-show` skill.

The skill reads the current session's transcript, distills it into 3-6 plain-English bullets plus one inline-SVG flow diagram, saves an HTML one-pager to `$TMPDIR/dsmode-recap-<timestamp>.html`, and `open`s it in the browser. Reply is one line: "Opened session recap in your browser."

See `skills/ds-mode-show/SKILL.md` for the full ruleset.
```

- [ ] **Step 7.3: Commit**

```bash
git add skills/ds-mode-show/SKILL.md commands/ds-mode-show.md
git commit -m "feat(skills): /ds-mode-show — HTML recap of current session

Distills the current Claude Code session transcript into a plain-English
one-pager with an inline-SVG flow diagram. Single-threaded (transcript is
one file; subagent adds no leverage)."
```

---

## Task 8: `/ds-mode-user-flows` skill

**Files:**
- Create: `skills/ds-mode-user-flows/SKILL.md`
- Create: `commands/ds-mode-user-flows.md`

- [ ] **Step 8.1: Write the skill**

```markdown
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
```

- [ ] **Step 8.2: Write the command file**

```markdown
---
description: Generate HTML + JSON describing the main user-facing flows of the current project, in plain English. Opens HTML in your browser.
---

Invoke the `ds-mode-user-flows` skill.

The skill spawns an Explore subagent to map 3-7 user-facing flows (persona, trigger, steps, outcome), then renders them as a horizontal-step-diagram HTML one-pager plus a JSON companion. Outputs saved to `$TMPDIR/dsmode-user-flows-<projectslug>-<timestamp>.{html,json}`.

See `skills/ds-mode-user-flows/SKILL.md` for the full ruleset.
```

- [ ] **Step 8.3: Commit**

```bash
git add skills/ds-mode-user-flows/SKILL.md commands/ds-mode-user-flows.md
git commit -m "feat(skills): /ds-mode-user-flows — map main flows of current project

Spawns an Explore subagent to gather 3-7 user-facing flows (persona,
steps, outcome) in plain English, then renders HTML + JSON to \$TMPDIR.
Multi-file project exploration → subagent justified."
```

---

## Task 9: Update existing slash commands

**Files:**
- Modify: `commands/ds-mode.md`
- Modify: `commands/dsm.md`

- [ ] **Step 9.1: Rewrite `commands/ds-mode.md`**

```markdown
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
```

- [ ] **Step 9.2: Rewrite `commands/dsm.md`**

```markdown
---
description: Alias for /ds-mode. Activate DS Mode and pick a mode (lite | full | visual | off).
---

Alias for `/ds-mode`. Identical behavior.

- `/dsm` — activate at default (`full`)
- `/dsm lite|full|visual` — set mode
- `/dsm off` — disable for the session

See `commands/ds-mode.md` and `skills/ds-mode/SKILL.md`.
```

- [ ] **Step 9.3: Commit**

```bash
git add commands/ds-mode.md commands/dsm.md
git commit -m "feat(commands): rewrite /ds-mode and /dsm for hook-based v2

Drops the --permanent install talk (no longer applicable — hooks handle
persistence). Adds /dsm <mode> syntax and documents DS_MODE_DEFAULT env
override for install-time default."
```

---

## Task 10: Rewrite `install.sh`

**Files:**
- Rewrite: `install.sh`

- [ ] **Step 10.1: Write the installer**

```bash
#!/usr/bin/env bash
#
# DS Mode installer — local clone path
#
# Default: install the plugin (copies into ~/.claude/plugins/), wire hooks,
#          install statusline element, set default mode to `full`.
# Flags:
#   --minimal       Plugin install only (no hooks, no statusline tweak).
#   --plugin-only   Same as --minimal — explicit name parity with caveman.
#   --dry-run       Print planned actions, write nothing.
#   --force         Re-run even if files already exist.
#   --default-mode <mode>  Set DS_MODE_DEFAULT in ~/.zshenv / ~/.bashrc.
#   --help|-h       Print this help and exit.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
FLAG_FILE="$CLAUDE_DIR/.ds-mode-active"
PLUGINS_DIR="$CLAUDE_DIR/plugins/marketplaces/ds-mode"

MINIMAL=0
DRY=0
FORCE=0
DEFAULT_MODE="full"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --minimal|--plugin-only) MINIMAL=1; shift ;;
    --dry-run) DRY=1; shift ;;
    --force) FORCE=1; shift ;;
    --default-mode) DEFAULT_MODE="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,/^set -e/p' "$0" | sed 's/^# \{0,1\}//;/^set -e/d'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

case "$DEFAULT_MODE" in lite|full|visual) ;; *)
  echo "Error: --default-mode must be lite | full | visual" >&2; exit 1 ;; esac

run() {
  if [[ "$DRY" -eq 1 ]]; then printf 'DRY: %s\n' "$*"; else eval "$@"; fi
}

echo "DS Mode installer"
echo "  source:  $SCRIPT_DIR"
echo "  target:  $CLAUDE_DIR"
echo "  mode default: $DEFAULT_MODE"
echo

# 1. Mirror repo into plugins dir (caveman-style local install).
run "mkdir -p \"$(dirname "$PLUGINS_DIR")\""
if [[ -d "$PLUGINS_DIR" && "$FORCE" -ne 1 ]]; then
  echo "  ! $PLUGINS_DIR already exists — pass --force to overwrite"
  exit 1
fi
run "rm -rf \"$PLUGINS_DIR\""
run "cp -R \"$SCRIPT_DIR\" \"$PLUGINS_DIR\""
echo "  ✓ plugin copied to $PLUGINS_DIR"

# 2. Strip stale outputStyle from settings.json (defensive cleanup).
if [[ -f "$SETTINGS_FILE" ]]; then
  run "cp \"$SETTINGS_FILE\" \"$SETTINGS_FILE.bak.preDSmode\""
  python3 - "$SETTINGS_FILE" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
try:
    data = json.loads(p.read_text())
except json.JSONDecodeError:
    print("  ! settings.json invalid JSON — skipping cleanup", file=sys.stderr)
    sys.exit(0)
stale_values = {"DS Mode", "Dipsh*t Mode", "ds-mode"}
val = data.get("outputStyle")
if isinstance(val, str) and val in stale_values:
    del data["outputStyle"]
    p.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  ✓ removed stale outputStyle={val!r} from settings.json")
PY
fi

# 3. Write flag file with the chosen default.
run "echo \"$DEFAULT_MODE\" > \"$FLAG_FILE\""
echo "  ✓ wrote $FLAG_FILE = $DEFAULT_MODE"

# 4. Add DS_MODE_DEFAULT export (so future sessions inherit).
if [[ "$MINIMAL" -ne 1 ]]; then
  for rc in "$HOME/.zshenv" "$HOME/.bashrc"; do
    [[ -f "$rc" ]] || continue
    if ! grep -q 'DS_MODE_DEFAULT' "$rc" 2>/dev/null; then
      run "echo 'export DS_MODE_DEFAULT=\"$DEFAULT_MODE\"' >> \"$rc\""
      echo "  ✓ added DS_MODE_DEFAULT=$DEFAULT_MODE to $rc"
    fi
  done
fi

cat <<EOF

Installed.

Next steps:
  - Restart Claude Code (or open a new session) — the SessionStart hook
    will inject the DS Mode ruleset.
  - Toggle in any session:
      /dsm           activate at default ($DEFAULT_MODE)
      /dsm lite|full|visual
      /dsm off       disable for this session

Statusline:
  Claude Code's statusline (configurable in settings.json) can pick up
  the DS Mode chip via:
      $PLUGINS_DIR/hooks/ds-mode-statusline.sh

Docs: $SCRIPT_DIR/INSTALL.md
EOF
```

- [ ] **Step 10.2: Make it executable**

```bash
chmod +x install.sh
```

- [ ] **Step 10.3: Dry-run smoke-test**

Run: `./install.sh --dry-run --force`
Expected: prints `DRY: ...` lines for each action; no real changes.

- [ ] **Step 10.4: Commit**

```bash
git add install.sh
git commit -m "feat(install): rewrite install.sh for plugin-based v2

Drops --permanent flag (outputStyle path retired). New flags: --minimal,
--plugin-only, --dry-run, --force, --default-mode. Copies the repo to
~/.claude/plugins/marketplaces/ds-mode/, removes any stale outputStyle
from settings.json, writes the flag file, and optionally adds
DS_MODE_DEFAULT to shell rc files."
```

---

## Task 11: Rewrite `install-claude-code.sh` (one-liner)

**Files:**
- Rewrite: `install-claude-code.sh`

- [ ] **Step 11.1: Write the script**

```bash
#!/usr/bin/env bash
#
# DS Mode — Claude Code one-liner installer
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
#
# Clones the repo to a temp dir and runs install.sh. Idempotent — re-runs
# are safe with --force.
#
set -euo pipefail

readonly REPO="nathan-hekman/ds-mode"
readonly BRANCH="${DS_MODE_BRANCH:-main}"

echo "DS Mode → Claude Code"
echo "  cloning $REPO@$BRANCH"

TMP_DIR="$(mktemp -d -t ds-mode-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMP_DIR/repo"
"$TMP_DIR/repo/install.sh" --force "$@"

echo
echo "Done. Restart Claude Code or run /dsm in any session."
```

- [ ] **Step 11.2: Smoke-test parses**

Run: `bash -n install-claude-code.sh`
Expected: no syntax errors, exit 0.

- [ ] **Step 11.3: Commit**

```bash
git add install-claude-code.sh
git commit -m "feat(install): rewrite curl|bash one-liner to clone + invoke install.sh

Replaces the old direct-curl-of-rule-files approach. Now clones the repo
to a temp dir (mktemp) and runs install.sh --force, which gives users
the full plugin layout instead of loose files."
```

---

## Task 12: Rewrite `README.md`

**Files:**
- Rewrite: `README.md`

- [ ] **Step 12.1: Write the new README**

Replace the existing README content with this structure (keep the existing logo/header/intro paragraphs at the top; rewrite from `## Install` onward):

```markdown
[KEEP existing logo + tagline + "DS Mode is a system-prompt overlay..." intro paragraphs]

## Install

**One line. Plugin install, hooks wired, mode set to `full`.**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

That's it. Restart Claude Code — DS Mode is on by default in every new session. Toggle per-session with `/dsm`.

See [INSTALL.md](./INSTALL.md) for advanced flags, local-clone install, and uninstall.

| Flag | What |
|---|---|
| `--minimal` | Plugin install only — skip statusline + shell rc edits. |
| `--default-mode <mode>` | Set the install-time default to `lite`, `full`, or `visual`. Defaults to `full`. |
| `--force` | Overwrite a prior install. |
| `--dry-run` | Print planned actions; write nothing. |

## What You Get

| Feature | Claude Code | Cursor / Windsurf | Copilot | Codex |
|---|:-:|:-:|:-:|:-:|
| Plain-English TLDR at bottom of replies | Y | Y* | Y* | Y* |
| HTML one-pager when reply is long/dense | Y | — | — | — |
| Mode switching (`lite` / `full` / `visual` / `off`) | Y | — | — | — |
| Statusline `DS:<mode>` chip | Y | — | — | — |
| `/ds-mode-show` (session recap HTML) | Y | — | — | — |
| `/ds-mode-user-flows` (project user flows HTML+JSON) | Y | — | — | — |
| Auto-activate every session | Y | with adapter | with adapter | with adapter |

\* Cursor/Copilot/Codex get the TLDR rule via the adapter rule files in `adapters/`. HTML one-pager + mode toggle + skills are Claude Code only — they depend on hooks + slash commands.

## Usage

Trigger with:
- `/dsm` or `/ds-mode` — activate at default mode
- `/dsm lite|full|visual` — pick a mode
- `/dsm off` — disable for this session
- Natural language: "ds mode on", "stop ds mode", "talk like ds mode"

Skills:
- `/ds-mode-show` — one-page HTML recap of the current conversation
- `/ds-mode-user-flows` — one-page HTML + JSON map of the project's main user flows

## Modes

| Mode | Behavior |
|---|---|
| `lite` | TLDR block at bottom of non-trivial replies. No HTML. Use when you want plain-English recaps without browser pop-ups. |
| `full` | **Default.** TLDR + HTML one-pager when the prime directive fires (length, density, decision, blocker triggers). |
| `visual` | TLDR + HTML one-pager on every non-trivial reply (>3 sentences). Use when you want consistent visual deliverables. |
| `off` | Disabled for this session. Flag removed; hooks emit nothing. |

## How It Works

DS Mode is a Claude Code plugin (`.claude-plugin/plugin.json`). It registers two hooks:

1. **SessionStart** (`hooks/ds-mode-activate.js`) — reads the current mode from `$CLAUDE_CONFIG_DIR/.ds-mode-active`, filters `skills/ds-mode/SKILL.md` to the active mode, and injects the ruleset as session context.
2. **UserPromptSubmit** (`hooks/ds-mode-tracker.js`) — parses `/dsm` commands, updates the flag, and re-anchors a short prime-directive reminder every turn so the rules survive context compression.

State is persistent across sessions in `$CLAUDE_CONFIG_DIR/.ds-mode-active`. HTML outputs are ephemeral in `$TMPDIR`.

## Other Tools

The `adapters/` directory holds rule-file generators for Cursor, Copilot, and Codex. These get you the TLDR rule but not the HTML one-pager — they don't have a hook system. See `adapters/<tool>/README.md`.

[KEEP existing footer sections — credits, license, etc.]
```

- [ ] **Step 12.2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README to caveman-style Install + What You Get + Modes

Drops the --permanent talk, leads with the one-liner curl|bash, adds a
What You Get matrix (Claude Code vs adapter targets), and documents the
four modes. Links to standalone INSTALL.md for advanced install."
```

---

## Task 13: Create `INSTALL.md`

**Files:**
- Create: `INSTALL.md`

- [ ] **Step 13.1: Write the file**

```markdown
# DS Mode — Install Reference

## One-line install (recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

Clones the repo to a temp dir and runs `install.sh --force`. Idempotent. Safe to re-run.

## Local clone install

```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                          # plugin + hooks + statusline (full default)
./install.sh --minimal                # plugin only (no statusline / shell rc edits)
./install.sh --default-mode lite      # default to lite mode in new sessions
./install.sh --dry-run                # preview, write nothing
./install.sh --force                  # overwrite a prior install
```

## What the installer does

1. Copies the repo into `$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode/`.
2. Backs up `$CLAUDE_CONFIG_DIR/settings.json` to `settings.json.bak.preDSmode` and strips any stale `outputStyle` value left over from v1.
3. Writes `$CLAUDE_CONFIG_DIR/.ds-mode-active = full` (or your `--default-mode`).
4. Adds `export DS_MODE_DEFAULT="full"` (or your default) to `~/.zshenv` / `~/.bashrc` so future shells inherit it (skipped with `--minimal`).

## Activating in Claude Code

The plugin's hooks fire automatically once the plugin is on your `~/.claude/plugins` path and the marketplace is registered. If hooks don't fire:

- Confirm `~/.claude/plugins/marketplaces/ds-mode/.claude-plugin/marketplace.json` exists.
- Open Claude Code's plugin manager and verify `ds-mode` is installed/enabled.
- Restart Claude Code (the SessionStart hook only fires on a fresh session).

## Verifying

```bash
cat $CLAUDE_CONFIG_DIR/.ds-mode-active   # should print: full (or your chosen default)
```

In Claude Code, the next session should open with the message `DS MODE ACTIVE — mode: full` in the system context. Type any non-trivial question and you should see:
- A TLDR block at the bottom of the reply, AND
- An HTML one-pager opened in your browser (in `full` or `visual` mode, when triggers fire).

## Switching modes

| Command | Effect |
|---|---|
| `/dsm` | activate at install default |
| `/dsm lite` | TLDR only, no HTML |
| `/dsm full` | TLDR + HTML when prime directive fires |
| `/dsm visual` | TLDR + HTML on every non-trivial reply |
| `/dsm off` | disable for this session |

Per-session state persists until you change it or `/dsm off`.

## Uninstall

```bash
rm -rf "$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode"
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active"
# Optionally restore your settings.json from the backup:
# cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
# Remove the DS_MODE_DEFAULT export from ~/.zshenv / ~/.bashrc if you don't want it.
```

## Files this plugin writes

| Path | Purpose |
|---|---|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | current mode (`lite`/`full`/`visual` or absent for `off`) |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | one-time backup of pre-install settings.json |
| `$TMPDIR/dsmode-summary-<ts>.html` | auto one-pagers fired during normal chat (ephemeral) |
| `$TMPDIR/dsmode-recap-<ts>.html` | `/ds-mode-show` output |
| `$TMPDIR/dsmode-user-flows-<slug>-<ts>.{html,json}` | `/ds-mode-user-flows` output |

The plugin never writes into your project repo or homedir without explicit opt-in.

## Other tools (Cursor, Copilot, Codex)

These get the TLDR-bottom rule via `adapters/<tool>/`. They do not get the HTML one-pager, mode toggle, or skills — those depend on Claude Code's hook system. See `adapters/<tool>/README.md`.
```

- [ ] **Step 13.2: Commit**

```bash
git add INSTALL.md
git commit -m "docs: standalone INSTALL.md mirroring caveman's install reference

Full install flow, flag reference, verification steps, uninstall, and
the exact list of files the plugin writes. Linked from README."
```

---

## Task 14: `.gitignore` and adapter cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 14.1: Append flag-file pattern to .gitignore**

Read the existing `.gitignore`, then append:

```
# DS Mode runtime state (must not be committed)
.ds-mode-active
```

- [ ] **Step 14.2: Commit**

```bash
git add .gitignore
git commit -m "chore(gitignore): exclude .ds-mode-active runtime flag"
```

---

## Task 15: Local install on Nathan's machine + smoke test

**Files:**
- None (runtime activation only).

- [ ] **Step 15.1: Stop and confirm with Nathan before running.**

Output to user:

> "About to run `./install.sh --force` on your machine. This will:
> - Copy this repo to `~/.claude/plugins/marketplaces/ds-mode/`
> - Back up `~/.claude/settings.json` and strip stale `outputStyle: \"Dipsh*t Mode\"`
> - Write `~/.claude/.ds-mode-active = full`
> - Add `export DS_MODE_DEFAULT=\"full\"` to `~/.zshenv` and `~/.bashrc`
>
> OK to proceed?"

Wait for explicit "yes" / "go" / "ship it" before continuing. If declined, stop here — the user can run it manually whenever.

- [ ] **Step 15.2: Run the installer**

```bash
cd "/Users/andreahekman/Documents/Other Projects/ds-mode"
./install.sh --force --default-mode full
```

Expected output ends with `Installed.` and shows the four bullet points (plugin copied, settings cleaned, flag written, shell rc updated).

- [ ] **Step 15.3: Verify state**

```bash
cat ~/.claude/.ds-mode-active
test -f ~/.claude/plugins/marketplaces/ds-mode/.claude-plugin/plugin.json && echo OK_plugin || echo MISSING_plugin
test -f ~/.claude/settings.json.bak.preDSmode && echo OK_backup || echo MISSING_backup
grep -q DS_MODE_DEFAULT ~/.zshenv 2>/dev/null && echo OK_zshenv || echo NO_zshenv
python3 -c "import json; print('outputStyle:', json.load(open('$HOME/.claude/settings.json')).get('outputStyle','<absent>'))"
```

Expected:
- `.ds-mode-active` → `full`
- `OK_plugin`
- `OK_backup`
- `OK_zshenv`
- `outputStyle: <absent>` (the stale value was stripped)

- [ ] **Step 15.4: Manually fire the SessionStart hook to confirm output**

```bash
CLAUDE_CONFIG_DIR=~/.claude node ~/.claude/plugins/marketplaces/ds-mode/hooks/ds-mode-activate.js | head -10
```

Expected first line: `DS MODE ACTIVE — mode: full`

- [ ] **Step 15.5: Manually fire the UserPromptSubmit hook (sanity)**

```bash
echo '{"prompt":"hello"}' | CLAUDE_CONFIG_DIR=~/.claude node ~/.claude/plugins/marketplaces/ds-mode/hooks/ds-mode-tracker.js
echo
```

Expected: prints `DS MODE ACTIVE (full). ...` reminder.

- [ ] **Step 15.6: Tell Nathan to restart Claude Code**

Reply: "Install verified — restart Claude Code (full quit + relaunch) and the next session should boot into DS Mode (`full`)."

---

## Task 16: Push to origin

**Files:**
- None (git push only).

- [ ] **Step 16.1: Show Nathan the commit log and ask before pushing**

Run:
```bash
cd "/Users/andreahekman/Documents/Other Projects/ds-mode"
git log --oneline origin/main..HEAD
git status
```

Output the log to the user and ask: "OK to push these N commits to origin/main?"

Wait for explicit yes.

- [ ] **Step 16.2: Push**

```bash
git push origin main
```

Expected: push succeeds. No `--no-verify`.

- [ ] **Step 16.3: Confirm**

Run: `git log --oneline -3`
Reply with the pushed commit hashes.

---

## Verification Checklist (run after Task 16)

- [ ] `~/.claude/.ds-mode-active` exists and contains `full`
- [ ] `~/.claude/plugins/marketplaces/ds-mode/` exists with the new layout
- [ ] `~/.claude/settings.json` no longer has `outputStyle: "Dipsh*t Mode"`
- [ ] A fresh Claude Code session shows the SessionStart hook firing (visible in transcript or via `/hooks` if exposed)
- [ ] `/dsm visual` updates the flag file to `visual`
- [ ] `/dsm off` removes the flag file
- [ ] `/ds-mode-show` produces an HTML file in `$TMPDIR` and opens it
- [ ] `/ds-mode-user-flows` spawns an Explore subagent and produces HTML+JSON
- [ ] `nathan-hekman/ds-mode` on GitHub has the new commits on `main`

---

## Self-Review Notes

- **Spec coverage:** All sections of the spec are mapped to tasks. Filesystem layout → Task 14 + per-skill paths. Hooks → Tasks 4, 5, 6. Plugin manifests → Task 1. Skills → Tasks 3, 7, 8. Commands → Tasks 9, 7, 8. Installer + README + INSTALL.md → Tasks 10, 11, 12, 13. Local activation + verification → Task 15.
- **No placeholders.** Every code block is complete. Hook scripts are full Node.js, no `// TODO`. Installer is full bash with all branches.
- **Type consistency.** Mode names (`lite`/`full`/`visual`/`off`) used consistently across hooks, SKILL.md, commands, README, INSTALL.md. Flag-file path (`$CLAUDE_CONFIG_DIR/.ds-mode-active`) consistent.
- **Out-of-scope guard.** No subagent definitions bundled. No per-repo rule files (`--with-init` equivalent). No MCP middleware. No `caveman-stats` analog.
